## 1. Define the application tracker domain

- [x] 1.1 Introduce a dedicated application record shape for the home page that is independent from interview review session entities
- [x] 1.2 Define the initial status/grouping scheme for application rows, including human-readable labels and aggregate status groups
- [x] 1.3 Create or adapt sample data for application records so the home page no longer depends on interview review blueprints

## 2. Refactor home page state composition

- [x] 2.1 Add a dedicated state path or provider logic for application tracker records and summary counts
- [x] 2.2 Remove the home page's dependence on review-oriented dashboard sections, including hero-centric summary composition
- [x] 2.3 Preserve existing review routes while decoupling the home route from interview-session semantics

## 3. Build the table-first home experience

- [x] 3.1 Replace the current home route layout with a dense application tracker table as the dominant content area
- [x] 3.2 Surface the core row fields for scanning: company, role or department, current status, current stage, next step or time, submission date, optional link, and notes
- [x] 3.3 Add lightweight aggregate counts that summarize the visible application corpus without overshadowing the table
- [x] 3.4 Ensure ended and rejected records remain visible in the default table view

## 4. Add row-level editing flows

- [x] 4.1 Implement a row-level interaction that opens a record editing surface instead of inline single-cell status editing
- [x] 4.2 Support editing the row fields needed to maintain one application pipeline coherently, including status and related context
- [x] 4.3 Allow records to exist and remain valid when no interview has occurred yet and when the application link is empty

## 5. Validate behavior and presentation boundaries

- [x] 5.1 Verify that multiple roles from the same company appear as separate rows with independent status and metadata
- [x] 5.2 Verify that the home page no longer depends on interview review content to explain or operate the tracking workflow
- [x] 5.3 Verify the dense table remains usable on smaller screens with an appropriate compact treatment
