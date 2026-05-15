# Budget Tracker

A single-page personal finance web app for tracking income and expenses. Built with vanilla JavaScript no frameworks, no build tools, no server required.

Live demo: [ryanadnyana.github.io/CodingCamp-11Mei26-ryan](https://ryanadnyana.github.io/CodingCamp-11Mei26-ryan/)

---

## Screenshots

| Light Mode | Dark Mode |
|---|---|
| ![Light mode](assets/lightTheme.png) | ![Dark mode](assets/darkTheme.png) |

---

## Features

### Transactions
- Add income or expense transactions with a name, amount, and category
- Amount field formats automatically with thousand separators (IDR) as you type, with support for decimal values (e.g. 123.456,78)
- Delete any transaction — the balance summary and chart update instantly
- All data is stored in the browser's Local Storage; nothing is sent to a server

### Balance Summary
- Displays total income, total expenses, and net balance in real time
- Net balance turns red when expenses exceed income
- Balance values can be hidden or shown using the eye button — preference is saved across sessions
- Large amounts scale down automatically to prevent overflow in the sidebar

### Filtering and Sorting
- Filter by period: All, Today, This Week, This Month, or a specific month picked from history
- Filter by type: All, Expense, or Income
- Sort by: Newest, Oldest, Highest Amount, Lowest Amount, Category A–Z, Category Z–A

### Spending Chart
- Interactive doughnut chart (Chart.js) showing expense distribution by category
- Tooltips show the amount and percentage for each category
- Updates automatically when transactions are added or deleted

### Category Management
- Built-in default categories: Food & Drinks, Transport, Entertainment, Salary
- Add and delete custom categories from the sidebar
- Each category is assigned a unique color used consistently across the chart and transaction list
- Categories in use by existing transactions cannot be deleted

### Dark / Light Theme
- Toggle between dark and light themes with a single click
- Theme preference is saved and restored on next visit

### Responsive Layout
- Sidebar and main content layout adapts to all screen sizes
- On mobile, the three main panels (Add Transaction, Chart, Transaction History) can be reordered by dragging the handle at the top of each panel
- Panel order is saved and restored across sessions

### Favicon
- The app icon appears in the browser tab, using an inline SVG no external file needed

---

## Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure |
| CSS3 | Styling, CSS custom properties for theming, responsive layout |
| JavaScript (ES6+) | All application logic, no frameworks |
| [Chart.js](https://www.chartjs.org/) | Doughnut chart (bundled locally) |
| Local Storage API | Client-side data persistence |

---

## Getting Started

### Requirements
- Any modern browser (Chrome, Firefox, Edge, or Safari)
- No installation, package manager, or internet connection required

### Running Locally
1. Clone or download this repository
2. Open `index.html` directly in your browser

### Folder Structure
```
budgetVisualitation/
├── index.html              # Main HTML file
├── css/
│   └── style.css           # All styles and theme variables
├── js/
│   ├── app.js              # All application logic
│   └── chart.umd.min.js    # Bundled Chart.js
├── assets/                 # Screenshots
└── README.md
```

---

## Usage

### Adding a Transaction
1. Select Expense or Income using the toggle at the top of the form
2. Enter the item name
3. Enter the amount it formats automatically as you type
4. Select a category from the dropdown
5. Click the submit button

### Filtering Transactions
- Use the Period dropdown to narrow by time range
- Select "Pick Month..." to choose a specific month from your history
- Use the Type dropdown to show only expenses or income

### Managing Categories
- Type a new category name in the sidebar input and click + or press Enter
- Click the x button next to any custom category to delete it
- Categories used by existing transactions cannot be deleted

### Hiding the Balance
- Click the eye icon in the balance card header to mask all balance values
- Click again to reveal them

---

## Privacy

All data is stored locally in your browser's Local Storage. No data is transmitted to any server.

---

## Possible Future Improvements
- Spending limit alerts per category
- Monthly summary and analytics view
- Multi-currency support

---

## License

Open source, available for educational use.
