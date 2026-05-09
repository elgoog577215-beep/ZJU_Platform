## Design

### Resource Request Stability

Resource lists will distinguish initial loading from background refresh. The first load keeps the current full loading state. Later searches, filters, sorting changes, pagination, and manual refreshes keep the page structure visible and show a compact refreshing indicator.

Each request gets a monotonically increasing sequence ID. When a response resolves, it only updates state if it belongs to the latest request. This prevents older filter/search responses from overwriting newer UI state.

### Search And Filter Ergonomics

The search input gets an explicit accessible label and the form declares its role with a clear label. The clear/reset actions stay visible only when useful. Filter summary copy remains compact but is made easier to scan.

### Mobile List Polish

Mobile resource cards keep status, ID, primary title, metadata, and tags, but selected items receive a clearer border/background state. Action buttons remain fixed-height and use consistent labels so dense mobile cards do not jump.

### Verification

The admin e2e spec will continue to exercise resource search/filter/reset, table presence, mobile drawer behavior, and no horizontal overflow. It will also assert that refresh/filter controls expose labels and that resource list content remains visible during normal interactions.
