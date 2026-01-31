# Leads Generator (Flask)

This is a minimal Flask frontend to run Apify actors with flexible filters, upload a logo, and download dataset results in Excel format (logo embedded).

Features
- Optional filters (Job Title, Location include/exclude, Email Status, Size, Industry, Revenue, Funding, Company Website, Keywords)
- Add multiple values per filter, remove values with a cross
- Upload company logo and include it in the generated Excel
- Enter Apify API key in UI and list actors
- Start actor run and download results as Excel with specific columns
- Light / Dark theme toggle

Quick start
1. Create and activate a virtualenv (Windows PowerShell):

   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

2. Install dependencies:

   pip install -r requirements.txt

3. Run the app:

   python app.py

4. Open http://127.0.0.1:5000

Notes & next steps
- The UI posts filters as JSON under key `filters`; your actor should read the `filters` input from the actor run input.
- Currently we embed the uploaded logo into cell A1 using openpyxl; you may adjust placement/size as needed.
- Add more robust error handling and paging for large datasets as desired.
