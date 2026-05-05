## ADDED Requirements

### Requirement: Event AI workflows share one canonical event catalog
The system SHALL provide a shared backend event intelligence catalog for event-related AI workflows. The catalog SHALL define canonical event category values, display labels, legacy aliases, campus options, audience options, and allowed extraction tags.

#### Scenario: Workflow reads canonical category options
- **WHEN** an event AI workflow needs event category options
- **THEN** it SHALL read them from the shared event intelligence catalog
- **THEN** it MUST NOT declare a private competing category list

#### Scenario: Legacy aliases remain recognized
- **WHEN** a legacy category or tag such as `学术讲座`, `公益实践`, or `项目招募` is passed to the shared service
- **THEN** the service SHALL normalize it to the matching canonical category when an alias match exists

#### Scenario: Event category filters use shared aliases
- **WHEN** the events API builds a category filter for a canonical category or legacy alias
- **THEN** the filter terms SHALL come from the shared event intelligence catalog
- **THEN** the events API MUST NOT maintain a separate competing event category alias table

### Requirement: Model prompts receive compact standard catalog context
The system SHALL provide a compact standard catalog context for event-related model prompts. The context SHALL include only standard options and aliases needed for extraction or recommendation, not full database rows.

#### Scenario: Prompt context uses standard options
- **WHEN** the system builds a model prompt for event extraction
- **THEN** the prompt SHALL include canonical category values and allowed audience options
- **THEN** the prompt SHALL instruct the model to return only those standard values

#### Scenario: Prompt context does not expose full database
- **WHEN** the system builds standard catalog context
- **THEN** the context MUST NOT include full event table rows or unrelated user data

### Requirement: Event payload validation gates model output
The system SHALL validate event-related model output against the shared catalog before returning or storing parsed fields. Unknown categories SHALL be normalized from event text when possible; otherwise they SHALL be classified as low confidence.

#### Scenario: Canonical category is accepted
- **WHEN** model output contains `category: "lecture"`
- **THEN** validation SHALL keep the category as `lecture`

#### Scenario: Legacy category is normalized
- **WHEN** model output contains `category: "学术讲座"`
- **THEN** validation SHALL normalize the category to `lecture`

#### Scenario: Unknown category is handled safely
- **WHEN** model output contains a category that is neither canonical nor a known alias
- **THEN** validation SHALL infer from available event text if possible
- **THEN** validation SHALL attach lower-confidence metadata or fallback to `other`

#### Scenario: Non-standard tags are filtered
- **WHEN** model output contains tags that are not in the shared allowed extraction tag list
- **THEN** validation SHALL remove the non-standard tags from the parsed payload

#### Scenario: Broad audience aliases normalize to standard audience values
- **WHEN** model output contains broad audience text such as `本科`, `硕士`, or `博士`
- **THEN** validation SHALL normalize those values to standard audience values such as `本科生`, `硕士生`, or `博士生`

### Requirement: Legacy event category classification is reviewable
The system SHALL provide an operator-run classification tool for existing event rows. The tool SHALL support dry-run preview, apply mode, confidence reporting, reasons, and database backup before mutation.

#### Scenario: Dry-run does not mutate events
- **WHEN** an operator runs the classification tool without apply mode
- **THEN** the tool SHALL report planned category changes
- **THEN** the tool MUST NOT update the database

#### Scenario: Apply mode creates backup before update
- **WHEN** an operator runs the classification tool in apply mode
- **THEN** the tool SHALL create a database backup before updating event categories
- **THEN** the tool SHALL report changed, unchanged, skipped, and low-confidence rows

#### Scenario: Low-confidence rows are not silently rewritten
- **WHEN** the classifier cannot meet the configured confidence threshold for an event
- **THEN** the tool SHALL report the row as low confidence or skipped
- **THEN** the tool MUST NOT silently overwrite it with an uncertain category
