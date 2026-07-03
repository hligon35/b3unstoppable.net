# Admin Dashboard Prompt

```text
Build an admin dashboard for the current workspace using the target workspace's brand, logo, site copy, and data, but follow the layout and interaction design below as literally as possible. Do not refer to another admin that cannot be seen. Use the concrete design specification below as the source of truth.

Only substitute these brand-specific items:
- site name
- logo asset
- editable public-site copy, images, and content fields that must match the target site
- analytics labels or newsletter naming only when they must reflect the brand

Everything else below is a direct layout and UX specification.

1. Auth screens

Login screen layout:
- Full viewport height page with centered card.
- Outer wrapper: full-width flex container, `min-height: 100vh`, horizontal padding about `16px`, centered both vertically and horizontally.
- Page background: very light brand-tinted wash, not plain white.
- Login card width: `100%` width with `max-width` around `24rem` (`384px`).
- Card styling: white background, `24px` corner radius, `32px` internal padding, light brand-tinted border, large soft shadow.
- Heading block at top:
   - title in bold `24px` text
   - supporting sentence below in muted `14px` text
   - bottom margin under the intro around `24px`
- Form fields:
   - stacked vertically
   - each label uses `14px` medium-weight text
   - label-to-input gap around `8px`
   - input height approximately `42px` to `44px`
   - inputs use `12px` radius, light border, subtle shadow, focus ring in brand color
- Password row:
   - input fills full width
   - “Peek” button sits inside the input row on the right with `12px` horizontal padding
- Forgot-password link:
   - right aligned above the submit button
   - orange or secondary accent text
- Error banner:
   - full-width rounded rectangle above submit button
   - light orange background, orange-tinted border, dark navy text
   - padding roughly `12px x 8px`
- Primary submit button:
   - full width
   - brand-blue background
   - `12px` radius
   - vertical padding about `10px`
   - medium font weight

Forgot-password screen layout:
- Same outer wrapper, same background wash, same centered `max-width: 384px` card.
- Same card radius, padding, border, and shadow as login.
- Title and supporting text match the login card scale.
- Single username field using the same field styles as login.
- Success/info copy appears below the field area in small text.
- Local preview reset-link text can appear when relevant in development.
- Primary action button matches login button.
- Bottom text link returns user to login and is centered below the card body.

Reset-password screen layout:
- Same centered single-card layout and visual treatment as login and forgot-password.
- Two password fields stacked vertically.
- First password field includes the same inline “Peek” control on the right.
- Invalid-token state uses the same orange warning banner style.
- Primary button spans full width and matches login styling.
- Bottom text link returns user to login.

2. Main admin shell

Overall page frame:
- Background color: light slate gray, not white.
- Entire admin shell uses `min-height: 100vh`.
- Center the desktop shell inside a `max-width: screen-2xl` container, approximately `1536px` wide maximum.
- Shell structure is a horizontal flex layout on desktop: left drawer plus right content area.

Desktop left drawer:
- Fixed-width column on large screens only.
- Expanded width: `20rem` (`320px`).
- Collapsed width: `6rem` (`96px`).
- Background: near-black slate.
- Drawer spans full viewport height.
- Internal structure:
   - top brand/header block
   - scrolling nav area in middle
   - logout block pinned to bottom
- Header padding:
   - expanded: about `20px` horizontal and `20px` vertical
   - collapsed: about `12px` horizontal and `16px` vertical
- Header bottom border and logout top border both use a faint white `10%` opacity line.
- Collapse button is a small rounded rectangle with white border and white text.

Mobile drawer:
- Hidden on desktop, slide-in overlay on small screens.
- Width: `20rem` (`320px`) with `max-width: 85vw`.
- Positioned `fixed` from top to bottom on the left.
- Background matches desktop drawer.
- Opening adds a full-screen dark translucent overlay behind it.
- Header row uses about `20px` horizontal padding and `16px` vertical padding.
- Header includes:
   - logo square around `44px x 44px`
   - site/admin title text block
   - close button on the right

Main content column:
- Fills remaining width.
- Outer padding:
   - mobile: `16px`
   - medium and up: `32px`
- Inner content wrapper max width: `72rem` (`1152px`).
- Top row includes the mobile-only Menu button.
- Menu button styling:
   - dark background
   - white text
   - `12px` radius
   - horizontal padding about `12px`
   - vertical padding about `8px`

3. Drawer navigation details

Navigation items:
- Use four primary views in this order:
   1. Web Traffic
   2. Newsletter
   3. Site Editor
   4. Help
- Nav list has vertical gap around `8px` between items.
- Each item is a full-width rounded card-like button.
- Expanded item padding: around `16px` horizontal and `12px` vertical.
- Collapsed item padding: around `8px` horizontal and `12px` vertical.
- Expanded state shows:
   - icon
   - label
   - short description text underneath or beside label block
- Collapsed state shows icon only, centered.
- Active item gets a darker emphasized state with stronger contrast than inactive items.
- Inactive items use white text at reduced opacity and brighten on hover.

Nav icons:
- Each icon sits inside a tight white rounded square chip.
- Chip radius: about `8px`.
- Chip padding: about `4px`.
- Icon graphic inside chip should fit in roughly `20px x 20px`.

Collapsed brand marker:
- When drawer is collapsed, show a short branded text marker under the header instead of the full title.
- Use uppercase compact text with generous tracking.

Logout block:
- Full-width button in bottom drawer section.
- Uses subtle translucent white background.
- Has icon on the left in expanded view and centered in collapsed view.
- Radius about `12px`.
- Padding about `16px x 8px` expanded, tighter when collapsed.

4. Shared content card system

All major panels in the admin use the same card component rules:
- white background
- light gray border
- `24px` corner radius
- `24px` padding
- small soft shadow
- top scroll margin so anchor jumps do not hide headings
- card headers have title on left and optional action on right
- card body content is vertically spaced with `12px` to `16px` gaps

Shared control styling:
- Standard text inputs and textareas use `12px` radius.
- Standard field horizontal padding: `16px`.
- Standard field vertical padding: `12px`.
- Standard small pills use fully rounded shape.
- Major action buttons use `12px` radius.
- Secondary outline buttons use gray border and brand-colored hover state.
- Success/info banners use light blue treatment.
- Warning/error banners use light orange treatment.

5. Web Traffic view layout

Overall structure:
- Vertical stack of sections with `24px` gap.
- First row is a three-column grid on large screens.
- Grid rule: `gap: 24px`, `lg:grid-cols-3`.
- Cards in this first row:
   - Subscribers
   - Browser Usage
   - Device Types
- Second row is a two-column grid on large screens.
- Grid rule: `gap: 24px`, `lg:grid-cols-2`.
- Cards in this second row:
   - Page Analytics
   - Top Referrers
- Final block below those rows is a separate Cloudflare or edge analytics section.

Subscribers card:
- Card title uses `Subscribers (count)` style.
- Header action on far right is a circular add button with no text.
- Add button reveals a hidden form directly under the header, not a modal.
- Form layout:
   - email input first
   - submit and cancel buttons beneath it in a wrapping row with about `12px` gap
- Success or error notice appears below the form if present.
- Subscriber list scroll container max height: about `24rem` (`384px`).
- Each list row uses bottom border, bottom padding around `12px`, and shows:
   - email in medium-weight dark text
   - created timestamp in smaller muted text

Browser Usage, Device Types, Page Analytics, Top Referrers cards:
- Each uses a scrollable vertical list.
- Max height about `24rem` (`384px`).
- Each row has bottom border and bottom padding around `12px`.
- Primary line uses medium-weight dark text.
- Secondary line uses smaller muted text.

6. Newsletter view layout

Top row:
- Two-column layout with uneven widths on extra-large screens.
- Grid rule: `gap: 24px`, `xl:grid-cols-[1.15fr_0.85fr]`.
- Left card is Compose Newsletter.
- Right card is Subscribers.

Compose Newsletter card:
- Starts with two helper paragraphs in muted small text.
- If editing an existing queue item, show an info banner row with cancel-edit pill button on the right.
- If there is an operation notice, show a rounded status banner below the intro.
- Form spacing uses `16px` vertical gaps.
- Subject input: full width.
- Newsletter content textarea:
   - full width
   - minimum height about `240px`
   - same field styling as shared inputs
- Date/time field block:
   - constrained to roughly `max-width: 24rem` (`384px`)
- Subscriber status row:
   - rounded `16px` container
   - light blue background
   - horizontal controls wrap on smaller screens
   - includes selected count text plus Select all and Clear selection buttons
- Action row below form:
   - wraps as needed
   - primary button for schedule/save
   - secondary outline button for processing due newsletters
   - gap about `12px`

Newsletter subscribers card:
- Header action is the same circular add icon used in Web Traffic.
- Add form appears inline at top of card when active.
- Form structure matches the dashboard subscriber form.
- Optional notice banner appears below the form.
- Scroll list max height: about `35rem` (`560px`).
- Each subscriber row is a rounded selectable label card:
   - `16px` radius
   - gray border
   - `16px` horizontal padding
   - `12px` vertical padding
   - checkbox on left
   - email and joined timestamp stacked on right
   - hover state uses faint brand-blue tint

Scheduled Queue card:
- Full-width card below the top newsletter row.
- Scroll container max height about `32.5rem` (`520px`).
- Queue items stack with `16px` gap.
- Each queue item is its own sub-card:
   - white background
   - gray border
   - `24px` radius
   - `20px` padding
   - small shadow
- Queue item top row:
   - subject on left in `18px` semibold text
   - status pill next to title
   - metadata lines below title for scheduled time, recipient count, created time, sent time
   - action pills on right for Edit and Delete when applicable
- Newsletter body preview appears in a muted light-gray rounded block below metadata.
- Last error, if present, appears in orange-tinted banner below the body preview.

7. Help view layout

Overall help structure:
- Starts with an overview card titled Admin Help.
- Inside that card, render a top selector row for help categories.
- Selector buttons are fully rounded pills with border, horizontal padding around `16px`, and vertical padding around `8px`.
- Active help pill uses solid dark background with white text.
- Inactive pills use white background or neutral border treatment.

Help section display:
- Show only the currently selected help section below the selector.
- Do not show all help sections at once.
- The selected help section appears as a second card below the overview card.
- Inside the selected help card, each help item is its own mini-card:
   - rounded `16px`
   - light border
   - very light slate background
   - padding around `16px x 12px`
- Each help item includes a control name label and a short instruction.

8. Site Editor view layout

Top-level panel:
- The Site Editor occupies a single full-width white card.
- Card uses the same `24px` radius, light border, `24px` padding, and soft shadow as other admin cards.

Editor chrome:
- Top area has a bottom border and `24px` bottom padding.
- Inside it, place a rounded toolbar container with:
   - light slate background
   - `16px` radius
   - `12px` padding
   - wrapped flex layout with space between three regions
- Region 1, tab switcher:
   - white sub-container
   - `12px` radius
   - `4px` inner padding
   - tabs use `8px` radius
   - tab padding around `12px x 8px`
   - active tab is dark with white text
- Region 2, status chips:
   - centered row of rounded full pills
   - each pill uses white background, shadow, horizontal padding `12px`, vertical padding `8px`
   - one pill shows draft status with a colored dot
   - one pill shows last-saved label with a dark muted dot
- Region 3, action icons:
   - three square icon buttons for publish, reset, save
   - each button size roughly `40px x 40px`
   - `12px` radius
   - white background, gray border

Editor tab set:
- Include these tabs in this order:
   - About Section
   - Newsletter
   - Events
   - Shop
   - Colors
   - Images

Events editor layout:
- When Events is active and a card is selected, split the content into two columns on large screens.
- Column ratio: approximately `0.9fr / 1.1fr`.
- Left column is the editor panel.
- Right column is the linked viewer/preview area.
- Left editor panel styling:
   - light gray background
   - gray border
   - `16px` radius
   - `20px` padding
- At top of the left panel, include a two-button secondary segmented control:
   - Events Page
   - Event Cards
   - container has white background, `12px` radius, `4px` padding
- Event Cards mode:
   - top row includes section intro and Add Card button
   - cards stack vertically with about `12px` gap
   - collapsed cards have minimum height around `64px`
   - selected card gets darker border and subtle shadow
   - expanded card becomes fully rounded instead of only stacked edge rounding
   - each card has title, optional Live pill, collapse button, delete button, and drag-handle button
   - card body contains structured fields for media type, badge, title, description, and other metadata

Shop editor layout:
- Same overall pattern as Events.
- Use a secondary toggle between Shop Page and Products.
- Products list supports add, remove, selection, and drag-and-drop reordering.
- Preserve the same card/list editing feel rather than switching to a table.

Colors and Images tabs:
- Keep them inside the same Site Editor surface, not separate admin pages.
- Use the same field and panel language as the other editor tabs.

9. Responsive behavior

Breakpoints and behavior:
- Large screens show permanent left drawer and full content layout.
- Small screens hide the permanent drawer and use the slide-in drawer.
- Main content keeps `16px` padding on mobile and `32px` on medium-plus screens.
- Cards remain stacked on small screens.
- Multi-column grids collapse to one column below their breakpoint.
- The site logo must appear in the mobile drawer header.
- When the desktop drawer is collapsed, labels disappear and only icons remain.

10. Required features within the specified layout

Web Traffic features:
- subscriber list with timestamps
- inline subscriber creation from add icon
- browser usage list
- device type list
- page analytics list
- top referrers list
- separate Cloudflare/edge analytics block when the workspace supports it

Newsletter features:
- subject, body, scheduled send time
- local timezone display
- subscriber checkbox selection
- select all / clear selection actions
- inline subscriber creation from add icon
- queue create, edit, save, cancel, delete, and process-now actions
- queue item status display and error display

Site Editor features:
- draft save
- reset draft
- publish with confirmation
- tabbed content editing
- nested Events and Shop sub-tabs
- add/remove/reorder event cards and products

Help features:
- top help category selector
- only one help section visible at a time
- concise instructions for every live control family

11. Persistence and implementation requirements

- Do not build only the layout. Every visible control must be wired.
- Subscriber creation must persist and refresh the list immediately.
- Newsletter queue actions must persist and reflect current state immediately.
- Site Editor publishing must affect the live site content path used by the workspace.
- Preserve correct timezone handling for scheduled newsletters.
- Keep server-only logic out of client bundles.
- Reuse the workspace’s existing auth, storage, content, and deployment patterns wherever possible.

12. Delivery standard

When implementing this admin in another workspace, the result should let a reviewer rebuild the same structure from this description alone:
- centered single-card auth pages
- light-slate admin canvas
- dark left drawer at `320px` expanded and `96px` collapsed
- `1152px` main content width inside a `1536px` overall shell
- white rounded cards with `24px` radius and `24px` padding
- `24px` gaps between major sections
- exact panel ordering and responsive grid behavior described above

At the end, summarize:
- what was implemented
- what was adjusted for the new brand
- how persistence is wired
- what validation was run
- whether deployment was completed
```