# Tiered Update Architecture for OfferNode Snapshot

## Problem Statement

The current offerNode snapshot merge process:
- Runs **hourly** and takes **~45 minutes**
- Updates all fields regardless of business criticality
- No differentiation between time-sensitive vs stable attributes

**Goal:** Delay updates based on attribute groups — some need immediate updates, others can be delayed 3-4 hours.

---

## Current Architecture

```
OfferNode Update → Kafka → offerNode_history → Hourly Merge (45 min) → offernode snapshot
```

---

## Proposed Architecture

```
                                    ┌─────────────────────────────────┐
                                    │     Kafka: offernode-updates    │
                                    └───────────────┬─────────────────┘
                                                    │
                                    ┌───────────────▼─────────────────┐
                                    │   Attribute Priority Router     │
                                    │   (Dataflow/Cloud Function)     │
                                    └───────┬───────────────┬─────────┘
                                            │               │
                    ┌───────────────────────▼───┐   ┌───────▼───────────────────────┐
                    │   Tier 1: IMMEDIATE       │   │   Tier 2: DELAYED (3-4 hrs)   │
                    │   offerNode_history_hot   │   │   offerNode_history_cold      │
                    └───────────────┬───────────┘   └───────────────┬───────────────┘
                                    │                               │
                    ┌───────────────▼───────────┐   ┌───────────────▼───────────────┐
                    │   Merge: Every 15 min     │   │   Merge: Every 4 hours        │
                    │   (only hot attributes)   │   │   (batch cold attributes)     │
                    └───────────────┬───────────┘   └───────────────┬───────────────┘
                                    │                               │
                                    └───────────────┬───────────────┘
                                                    │
                                    ┌───────────────▼─────────────────┐
                                    │      offernode (snapshot)       │
                                    └─────────────────────────────────┘
```

---

## Attribute Classification

### Tier 1: IMMEDIATE (Business-Critical, Customer-Facing)

| Attribute | Reason |
|-----------|--------|
| `itemStatusCode` | Item availability - critical for orders |
| `olStatus` | Online status - customer facing |
| `fulfillmentOptions` | Customer delivery choices |
| `fulfillmentPath` | Order routing - critical |
| `fulfillmentSpeed` | Delivery promise to customers |
| `nodeState` | Node availability |
| `isRecallInd` | Safety critical - legal compliance |
| `calculatedValidInd` | Validity flag for offers |
| `priceTypeCode` | Pricing display |
| `accessTypes` | Access control |
| `nilPick` | Picking availability |
| `hasMFC` | Micro-fulfillment center status |
| `locationAreaEligible` | Service area eligibility |
| `pathOverrideIncl` | Fulfillment path overrides |
| `pathOverrideExcl` | Fulfillment path exclusions |

### Tier 2: DELAYED (Metadata, Stable, Less Volatile)

| Attribute | Reason |
|-----------|--------|
| `deptNbr` | Department info - rarely changes |
| `deptCatGrp` | Category grouping - stable |
| `deptCatGrpCat` | Category hierarchy - stable |
| `deptCatGrpCatSubcat` | Subcategory - stable |
| `deptCatGrpCatSubcatFineline` | Fineline hierarchy - stable |
| `finelineNbr` | Fineline number - stable |
| `aisle` | Store layout - infrequent changes |
| `endcap` | Store layout - infrequent changes |
| `girth` | Physical dimensions - static |
| `buyingRegionCode` | Region assignment - stable |
| `assortmentTypeCode` | Assortment type - stable |
| `distributorType` | Distributor info - stable |
| `acctgDept` | Accounting department - stable |
| `gtin` | Product identifier - static |
| `itemNumber` | Item number - static |
| `itemTypeCode` | Item classification - stable |
| `itemSubTypeCode` | Item sub-classification - stable |
| `mbmTypeCode` | MBM type - stable |
| `cidPrmItmTypCd` | CID item type - stable |
| `atsClassification` | ATS classification - stable |

---

## Implementation Options

### Option 1: Dual History Tables (Recommended)

**Pros:** Clean separation, optimized queries, easy to monitor
**Cons:** Requires router logic, two tables to manage

#### Schema Changes

```sql
-- Hot history table (immediate updates)
CREATE TABLE `project.dataset.offerNode_history_hot` (
  partitionId INTEGER NOT NULL,
  offerIdNode STRING,
  lastUpdateTimestamp TIMESTAMP,
  offerId STRING NOT NULL,
  node INTEGER,
  -- Include only HOT tier fields
  itemStatusCode STRING,
  olStatus STRING,
  fulfillmentOptions ARRAY<STRING>,
  fulfillmentPath ARRAY<STRING>,
  fulfillmentSpeed ARRAY<STRING>,
  nodeState STRING,
  isRecallInd STRING,
  calculatedValidInd STRING,
  priceTypeCode STRING,
  accessTypes ARRAY<STRING>,
  nilPick STRING,
  hasMFC BOOLEAN,
  locationAreaEligible ARRAY<STRING>,
  pathOverrideIncl ARRAY<STRING>,
  pathOverrideExcl ARRAY<STRING>
)
PARTITION BY DATE(lastUpdateTimestamp)
CLUSTER BY offerIdNode;

-- Cold history table (delayed updates)
CREATE TABLE `project.dataset.offerNode_history_cold` (
  partitionId INTEGER NOT NULL,
  offerIdNode STRING,
  lastUpdateTimestamp TIMESTAMP,
  offerId STRING NOT NULL,
  node INTEGER,
  -- Include ALL fields (full record for batch processing)
  -- ... all columns from offernode schema
  processed_flag BOOLEAN DEFAULT FALSE
)
PARTITION BY DATE(lastUpdateTimestamp)
CLUSTER BY offerIdNode;
```

### Option 2: Single Table with Priority Flag (Simpler)

**Pros:** Simpler schema, single source of truth
**Cons:** Larger table scans, need careful indexing

```sql
-- Add columns to existing history table
ALTER TABLE `project.dataset.offerNode_history` 
ADD COLUMN update_priority STRING;  -- 'HOT' or 'COLD'
ADD COLUMN changed_fields ARRAY<STRING>;
```

### Option 3: Partitioned by Priority (Hybrid)

```sql
CREATE TABLE `project.dataset.offerNode_history_v2` (
  offerIdNode STRING,
  lastUpdateTimestamp TIMESTAMP,
  update_priority STRING,
  -- all fields...
)
PARTITION BY DATE(lastUpdateTimestamp)
CLUSTER BY update_priority, offerIdNode;
```

---

## Router Implementation

### Dataflow Job (Python)

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

# Define immediate/hot attributes
IMMEDIATE_ATTRS = {
    'itemStatusCode', 'olStatus', 'fulfillmentOptions', 'fulfillmentPath',
    'fulfillmentSpeed', 'nodeState', 'isRecallInd', 'calculatedValidInd',
    'priceTypeCode', 'accessTypes', 'nilPick', 'hasMFC', 
    'locationAreaEligible', 'pathOverrideIncl', 'pathOverrideExcl'
}

class ClassifyUpdatePriority(beam.DoFn):
    def process(self, message):
        changed_fields = set(message.get('changed_fields', []))
        
        # Check if ANY immediate field changed
        has_immediate_change = bool(changed_fields & IMMEDIATE_ATTRS)
        
        if has_immediate_change:
            message['update_priority'] = 'HOT'
            yield beam.pvalue.TaggedOutput('hot', message)
        else:
            message['update_priority'] = 'COLD'
            yield beam.pvalue.TaggedOutput('cold', message)

def run_pipeline():
    options = PipelineOptions()
    
    with beam.Pipeline(options=options) as p:
        messages = (
            p 
            | 'Read Kafka' >> beam.io.ReadFromKafka(
                consumer_config={'bootstrap.servers': 'kafka:9092'},
                topics=['offernode-updates']
            )
            | 'Parse JSON' >> beam.Map(parse_json)
        )
        
        classified = messages | 'Classify' >> beam.ParDo(
            ClassifyUpdatePriority()
        ).with_outputs('hot', 'cold')
        
        # Write to hot table
        classified.hot | 'Write Hot' >> beam.io.WriteToBigQuery(
            'project:dataset.offerNode_history_hot',
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND
        )
        
        # Write to cold table
        classified.cold | 'Write Cold' >> beam.io.WriteToBigQuery(
            'project:dataset.offerNode_history_cold',
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND
        )
```

### Cloud Function Alternative (Simpler)

```python
import functions_framework
from google.cloud import bigquery

IMMEDIATE_ATTRS = {
    'itemStatusCode', 'olStatus', 'fulfillmentOptions', 'fulfillmentPath',
    'fulfillmentSpeed', 'nodeState', 'isRecallInd', 'calculatedValidInd',
    'priceTypeCode', 'accessTypes', 'nilPick', 'hasMFC'
}

client = bigquery.Client()

@functions_framework.cloud_event
def process_offernode_update(cloud_event):
    message = cloud_event.data
    changed_fields = set(message.get('changed_fields', []))
    
    has_immediate = bool(changed_fields & IMMEDIATE_ATTRS)
    
    table_id = (
        'project.dataset.offerNode_history_hot' 
        if has_immediate 
        else 'project.dataset.offerNode_history_cold'
    )
    
    message['update_priority'] = 'HOT' if has_immediate else 'COLD'
    
    errors = client.insert_rows_json(table_id, [message])
    if errors:
        raise Exception(f"BigQuery insert failed: {errors}")
```

---

## Merge Queries

### HOT Merge (Every 15-30 minutes)

```sql
-- Scheduled Query: offernode_hot_merge
-- Frequency: Every 15 minutes

MERGE `project.dataset.offernode` AS target
USING (
  SELECT * FROM (
    SELECT 
      *,
      ROW_NUMBER() OVER (
        PARTITION BY offerIdNode 
        ORDER BY lastUpdateTimestamp DESC
      ) as rn
    FROM `project.dataset.offerNode_history_hot`
    WHERE lastUpdateTimestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  ) 
  WHERE rn = 1
) AS source
ON target.offerIdNode = source.offerIdNode

WHEN MATCHED THEN UPDATE SET
  target.itemStatusCode = source.itemStatusCode,
  target.olStatus = source.olStatus,
  target.fulfillmentOptions = source.fulfillmentOptions,
  target.fulfillmentPath = source.fulfillmentPath,
  target.fulfillmentSpeed = source.fulfillmentSpeed,
  target.nodeState = source.nodeState,
  target.isRecallInd = source.isRecallInd,
  target.calculatedValidInd = source.calculatedValidInd,
  target.priceTypeCode = source.priceTypeCode,
  target.accessTypes = source.accessTypes,
  target.nilPick = source.nilPick,
  target.hasMFC = source.hasMFC,
  target.locationAreaEligible = source.locationAreaEligible,
  target.pathOverrideIncl = source.pathOverrideIncl,
  target.pathOverrideExcl = source.pathOverrideExcl,
  target.lastUpdateTimestamp = source.lastUpdateTimestamp

WHEN NOT MATCHED THEN INSERT (
  partitionId, offerIdNode, lastUpdateTimestamp, offerId, node,
  itemStatusCode, olStatus, fulfillmentOptions, fulfillmentPath,
  fulfillmentSpeed, nodeState, isRecallInd, calculatedValidInd,
  priceTypeCode, accessTypes, nilPick, hasMFC, locationAreaEligible,
  pathOverrideIncl, pathOverrideExcl
) VALUES (
  source.partitionId, source.offerIdNode, source.lastUpdateTimestamp, 
  source.offerId, source.node, source.itemStatusCode, source.olStatus,
  source.fulfillmentOptions, source.fulfillmentPath, source.fulfillmentSpeed,
  source.nodeState, source.isRecallInd, source.calculatedValidInd,
  source.priceTypeCode, source.accessTypes, source.nilPick, source.hasMFC,
  source.locationAreaEligible, source.pathOverrideIncl, source.pathOverrideExcl
);
```

### COLD Merge (Every 4 hours)

```sql
-- Scheduled Query: offernode_cold_merge
-- Frequency: Every 4 hours

MERGE `project.dataset.offernode` AS target
USING (
  SELECT * FROM (
    SELECT 
      *,
      ROW_NUMBER() OVER (
        PARTITION BY offerIdNode 
        ORDER BY lastUpdateTimestamp DESC
      ) as rn
    FROM `project.dataset.offerNode_history_cold`
    WHERE lastUpdateTimestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 HOUR)
  ) 
  WHERE rn = 1
) AS source
ON target.offerIdNode = source.offerIdNode

WHEN MATCHED THEN UPDATE SET
  target.deptNbr = source.deptNbr,
  target.deptCatGrp = source.deptCatGrp,
  target.deptCatGrpCat = source.deptCatGrpCat,
  target.deptCatGrpCatSubcat = source.deptCatGrpCatSubcat,
  target.deptCatGrpCatSubcatFineline = source.deptCatGrpCatSubcatFineline,
  target.deptCatGrpNum = source.deptCatGrpNum,
  target.deptCatNumber = source.deptCatNumber,
  target.deptSubCat = source.deptSubCat,
  target.finelineNbr = source.finelineNbr,
  target.aisle = source.aisle,
  target.endcap = source.endcap,
  target.girth = source.girth,
  target.gtin = source.gtin,
  target.itemNumber = source.itemNumber,
  target.itemTypeCode = source.itemTypeCode,
  target.itemSubTypeCode = source.itemSubTypeCode,
  target.buyingRegionCode = source.buyingRegionCode,
  target.assortmentTypeCode = source.assortmentTypeCode,
  target.distributorType = source.distributorType,
  target.acctgDept = source.acctgDept,
  target.mbmTypeCode = source.mbmTypeCode,
  target.cidPrmItmTypCd = source.cidPrmItmTypCd,
  target.atsClassification = source.atsClassification,
  target.legacyDistributorId = source.legacyDistributorId,
  target.eventType = source.eventType,
  target.isBreakpack = source.isBreakpack,
  target.nodeType = source.nodeType,
  target.locationAreaOverrideExcl = source.locationAreaOverrideExcl,
  target.locationAreaOverrideIncl = source.locationAreaOverrideIncl,
  target.rulesMatchedInvExcp = source.rulesMatchedInvExcp,
  target.lastUpdateTimestamp = source.lastUpdateTimestamp

WHEN NOT MATCHED THEN INSERT ROW;
```

---

## Configuration Table

```sql
-- Attribute priority configuration (for easy updates)
CREATE OR REPLACE TABLE `project.dataset.attribute_priority_config` AS
SELECT * FROM UNNEST([
  -- TIER 1: IMMEDIATE
  STRUCT('itemStatusCode' AS attribute_name, 'IMMEDIATE' AS tier, 0 AS delay_hours, 'Item availability' AS description),
  STRUCT('olStatus', 'IMMEDIATE', 0, 'Online status'),
  STRUCT('fulfillmentOptions', 'IMMEDIATE', 0, 'Customer delivery choices'),
  STRUCT('fulfillmentPath', 'IMMEDIATE', 0, 'Order routing'),
  STRUCT('fulfillmentSpeed', 'IMMEDIATE', 0, 'Delivery promise'),
  STRUCT('nodeState', 'IMMEDIATE', 0, 'Node availability'),
  STRUCT('isRecallInd', 'IMMEDIATE', 0, 'Safety - legal compliance'),
  STRUCT('calculatedValidInd', 'IMMEDIATE', 0, 'Offer validity'),
  STRUCT('priceTypeCode', 'IMMEDIATE', 0, 'Pricing display'),
  STRUCT('accessTypes', 'IMMEDIATE', 0, 'Access control'),
  STRUCT('nilPick', 'IMMEDIATE', 0, 'Picking availability'),
  STRUCT('hasMFC', 'IMMEDIATE', 0, 'MFC status'),
  STRUCT('locationAreaEligible', 'IMMEDIATE', 0, 'Service eligibility'),
  STRUCT('pathOverrideIncl', 'IMMEDIATE', 0, 'Path overrides'),
  STRUCT('pathOverrideExcl', 'IMMEDIATE', 0, 'Path exclusions'),
  
  -- TIER 2: DELAYED
  STRUCT('deptNbr', 'DELAYED', 4, 'Department - stable'),
  STRUCT('deptCatGrp', 'DELAYED', 4, 'Category grouping'),
  STRUCT('finelineNbr', 'DELAYED', 4, 'Fineline - stable'),
  STRUCT('aisle', 'DELAYED', 4, 'Store layout'),
  STRUCT('endcap', 'DELAYED', 4, 'Store layout'),
  STRUCT('girth', 'DELAYED', 4, 'Physical dimensions'),
  STRUCT('gtin', 'DELAYED', 4, 'Product identifier'),
  STRUCT('itemNumber', 'DELAYED', 4, 'Item number'),
  STRUCT('buyingRegionCode', 'DELAYED', 4, 'Region - stable'),
  STRUCT('assortmentTypeCode', 'DELAYED', 4, 'Assortment type'),
  STRUCT('distributorType', 'DELAYED', 4, 'Distributor info')
]);
```

---

## Monitoring & Alerts

### Key Metrics to Track

```sql
-- Hot table processing lag
SELECT 
  COUNT(*) as pending_hot_records,
  MIN(lastUpdateTimestamp) as oldest_pending,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MIN(lastUpdateTimestamp), MINUTE) as lag_minutes
FROM `project.dataset.offerNode_history_hot`
WHERE lastUpdateTimestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 HOUR);

-- Cold table backlog
SELECT 
  COUNT(*) as pending_cold_records,
  MIN(lastUpdateTimestamp) as oldest_pending,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MIN(lastUpdateTimestamp), HOUR) as lag_hours
FROM `project.dataset.offerNode_history_cold`
WHERE lastUpdateTimestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR);

-- Merge job performance
SELECT 
  job_id,
  creation_time,
  end_time,
  TIMESTAMP_DIFF(end_time, creation_time, SECOND) as duration_seconds,
  total_bytes_processed,
  total_slot_ms
FROM `region-us.INFORMATION_SCHEMA.JOBS`
WHERE job_id LIKE '%offernode%merge%'
ORDER BY creation_time DESC
LIMIT 20;
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Hot merge lag | > 30 min | > 1 hour |
| Cold merge lag | > 5 hours | > 8 hours |
| Hot merge duration | > 10 min | > 20 min |
| Cold merge duration | > 30 min | > 1 hour |

---

## Implementation Checklist

- [ ] **Phase 1: Setup**
  - [ ] Create `attribute_priority_config` table
  - [ ] Finalize attribute classification with business stakeholders
  - [ ] Create `offerNode_history_hot` table
  - [ ] Create `offerNode_history_cold` table

- [ ] **Phase 2: Router**
  - [ ] Implement Dataflow/Cloud Function router
  - [ ] Deploy to staging environment
  - [ ] Validate routing logic with sample messages

- [ ] **Phase 3: Merge Jobs**
  - [ ] Create HOT merge scheduled query (15 min)
  - [ ] Create COLD merge scheduled query (4 hours)
  - [ ] Test merge performance in staging

- [ ] **Phase 4: Cutover**
  - [ ] Run parallel with existing system
  - [ ] Validate data consistency
  - [ ] Switch over Kafka consumer
  - [ ] Deprecate old hourly merge

- [ ] **Phase 5: Monitoring**
  - [ ] Set up lag monitoring dashboards
  - [ ] Configure alerts
  - [ ] Document runbooks

---

## Expected Benefits

| Metric | Current | After |
|--------|---------|-------|
| Critical field latency | ~1 hour | ~15-30 min |
| Merge job duration | 45 min | HOT: 5-10 min, COLD: 20-30 min |
| Resource utilization | High (full table scan hourly) | Optimized (smaller frequent + larger batched) |
| Cost efficiency | Baseline | ~30-40% reduction |

---

## Questions for Business Stakeholders

1. Which attributes are truly customer-facing and time-sensitive?
2. What is the acceptable latency for pricing updates?
3. Are there any compliance requirements for specific fields?
4. Should we add a third tier for truly static attributes (update daily)?


