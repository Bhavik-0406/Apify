import io
import json
import os
import time
from flask import Flask, render_template, request, jsonify, send_file
import requests
import pandas as pd
from openpyxl import load_workbook
from openpyxl.drawing.image import Image as XLImage
from PIL import Image as PILImage
from flask_cors import CORS

# Config
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)

# Helper functions for Apify API interaction
APIFY_BASE = 'https://api.apify.com/v2'

def apify_headers(api_key):
    return {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

def list_actors(api_key):
    url = f'{APIFY_BASE}/actors'
    resp = requests.get(url, headers=apify_headers(api_key), params={'limit': 100})
    resp.raise_for_status()
    data = resp.json()
    # Return list of {id, name, title}
    return [{'id': a.get('id'), 'name': a.get('name'), 'title': a.get('title')} for a in data.get('data', [])]

def start_actor(api_key, actor_id_or_name, input_obj):
    url = f'{APIFY_BASE}/actors/{actor_id_or_name}/runs'
    resp = requests.post(url, headers=apify_headers(api_key), data=json.dumps({'input': input_obj}))
    resp.raise_for_status()
    return resp.json()

def get_run(api_key, actor_id_or_name, run_id):
    url = f'{APIFY_BASE}/actors/{actor_id_or_name}/runs/{run_id}'
    resp = requests.get(url, headers=apify_headers(api_key))
    resp.raise_for_status()
    return resp.json()

def get_dataset_items(api_key, dataset_id):
    # Paginate through dataset items to support arbitrarily large datasets
    items = []
    limit = 1000
    offset = 0
    while True:
        params = {'format': 'json', 'clean': 'true', 'limit': limit, 'offset': offset}
        resp = requests.get(f'{APIFY_BASE}/datasets/{dataset_id}/items', headers=apify_headers(api_key), params=params)
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        items.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return items

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/list-actors', methods=['POST'])
def route_list_actors():
    data = request.get_json()
    api_key = data.get('apiKey')
    if not api_key:
        return jsonify({'error': 'API key required'}), 400
    try:
        actors = list_actors(api_key)
        return jsonify({'actors': actors})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/run-actor', methods=['POST'])
def route_run_actor():
    # We accept multipart form data (for logo file) or JSON
    api_key = request.form.get('apiKey') or (request.json and request.json.get('apiKey'))
    actor = request.form.get('actor') or (request.json and request.json.get('actor'))
    filters_raw = request.form.get('filters') or (request.json and request.json.get('filters'))
    if not api_key or not actor:
        return jsonify({'error': 'apiKey and actor are required'}), 400
    filters = json.loads(filters_raw) if isinstance(filters_raw, str) else (filters_raw or {})

    # Logo file optional
    logo_file = request.files.get('logo')
    logo_path = None
    if logo_file:
        logo_filename = f"logo_{int(time.time())}_{logo_file.filename}"
        logo_path = os.path.join(UPLOAD_FOLDER, logo_filename)
        logo_file.save(logo_path)

    # Start actor
    try:
        start_resp = start_actor(api_key, actor, {'filters': filters})
    except Exception as e:
        return jsonify({'error': f'Failed to start actor: {e}'}), 400

    run_id = start_resp.get('id')
    dataset_id = start_resp.get('defaultDatasetId')

    # Poll until dataset available or run finished
    timeout = 300
    interval = 3
    t0 = time.time()
    status = start_resp.get('status')
    while time.time() - t0 < timeout:
        if dataset_id:
            break
        try:
            run = get_run(api_key, actor, run_id)
            status = run.get('status')
            dataset_id = run.get('defaultDatasetId')
            if status in ('SUCCEEDED', 'FAILED', 'ABORTED') and dataset_id:
                break
            if status in ('FAILED', 'ABORTED') and not dataset_id:
                break
        except Exception:
            pass
        time.sleep(interval)

    if not dataset_id:
        # attempt to continue even if no dataset: try getting run and failing gracefully
        try:
            run = get_run(api_key, actor, run_id)
            status = run.get('status')
        except Exception:
            status = 'UNKNOWN'
        return jsonify({'error': 'No dataset produced', 'status': status}), 400

    # Fetch dataset items
    try:
        items = get_dataset_items(api_key, dataset_id)
    except Exception as e:
        return jsonify({'error': f'Failed to fetch dataset items: {e}'}), 400

    # Map to desired columns
    columns = [
        'First Name', 'Last Name', 'Title', 'Seniority', 'Company Name', 'Email', 'Personal Phone',
        'Corporate Phone', 'Industry', 'Size', 'Revenue', 'Funding', 'Company Address', 'Company City', 'Company State'
    ]

    rows = []
    for it in items:
        # attempt to map common keys, flexible
        fn = it.get('firstName') or it.get('FirstName') or it.get('first_name') or ''
        ln = it.get('lastName') or it.get('LastName') or it.get('last_name') or ''
        title = it.get('title') or it.get('position') or ''
        seniority = it.get('seniority') or ''
        company = it.get('company') or it.get('companyName') or it.get('Company') or ''
        email = it.get('email') or it.get('Email') or ''
        pphone = it.get('personalPhone') or it.get('personal_phone') or ''
        cphone = it.get('corporatePhone') or it.get('corporate_phone') or ''
        industry = it.get('industry') or ''
        size = it.get('size') or it.get('companySize') or ''
        revenue = it.get('revenue') or ''
        funding = it.get('funding') or ''
        addr = it.get('companyAddress') or it.get('address') or ''
        city = it.get('companyCity') or it.get('city') or ''
        state = it.get('companyState') or it.get('state') or ''

        row = [fn, ln, title, seniority, company, email, pphone, cphone, industry, size, revenue, funding, addr, city, state]
        rows.append(row)

    df = pd.DataFrame(rows, columns=columns)

    # Write to Excel in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Results')

    output.seek(0)

    # If logo provided, insert into the sheet using openpyxl
    if logo_path and os.path.exists(logo_path):
        wb = load_workbook(filename=output)
        ws = wb['Results']
        try:
            # Resize large logos to fit nicely in header area
            max_w, max_h = 300, 80
            try:
                with PILImage.open(logo_path) as im:
                    w, h = im.size
                    ratio = min(1.0, max_w / w, max_h / h)
                    if ratio < 1.0:
                        new_size = (int(w * ratio), int(h * ratio))
                        im = im.resize(new_size, PILImage.LANCZOS)
                        tmp_path = logo_path + '.resized.png'
                        im.save(tmp_path, format='PNG')
                        img = XLImage(tmp_path)
                        try:
                            os.remove(tmp_path)
                        except Exception:
                            pass
                    else:
                        img = XLImage(logo_path)
            except Exception:
                # Fallback if PIL is unavailable or image invalid
                img = XLImage(logo_path)

            img.anchor = 'A1'
            ws.add_image(img)
        except Exception:
            pass
        # Save back to BytesIO
        out2 = io.BytesIO()
        wb.save(out2)
        out2.seek(0)
        return send_file(out2, as_attachment=True, download_name='apify_results.xlsx', mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    output.seek(0)
    return send_file(output, as_attachment=True, download_name='apify_results.xlsx', mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
