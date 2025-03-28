from flask import Flask, jsonify, request, render_template, session, Response
from flask_session import Session
from backend.db import get_db_connection
from backend.auth import authorize_user, register_user
from io import StringIO
from werkzeug.utils import secure_filename
import csv
import os
import hashlib

from flask_socketio import SocketIO

app = Flask(__name__, template_folder="../templates", static_folder="../static")
socketio = SocketIO(app, cors_allowed_origins="*")  # Поддержка WebSocket

app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024  # 2 MB
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/gif'}

app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'default_secret_key')
app.config['SESSION_TYPE'] = 'filesystem'  # Хранение сессий на диске
Session(app)



@app.route('/main_page')
def main_page():
    return render_template('index.html')

@app.route('/authorization_page')
def authorization_page():
    return render_template('authorization.html')

@app.route('/register_page')
def register_page():
    return render_template('registration.html')

@app.route('/skladove_karty')
def start_page():
    return render_template('skladove_karty.html')
    
@app.route('/categories')
def categories():
    return render_template('categories.html')

@app.route('/nova_skladova_karta')
def novaSkladovaKarta():
    return render_template('novaSkladovaKarta.html')

@app.route('/opravit_skladova_karta')
def opravitSkladovaKarta():
    return render_template('opravitSkladovaKarta.html')

@app.route('/naskladnenie')
def naskladnenie():
    return render_template('naskladnenie.html')

@app.route('/noveNaskladnenie')
def noveNaskladnenie():
    return render_template('noveNaskladnenie.html')

@app.route('/opravitNaskladnenie')
def opravitNaskladnenie():
    return render_template('opravitNaskladnenie.html')

@app.route('/inventury')
def inventury():
    return render_template('inventury.html')

@app.route('/novaInventura')
def novaInventura():
    return render_template('novaInventura.html')

@app.route('/opravitInventura')
def opravitInventura():
    return render_template('opravitInventura.html')

@app.route('/infoInventura')
def infoInventura():
    return render_template('infoInventura.html')

@app.route('/profile')
def profile():
    return render_template('profile.html')

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({'success': True})

@app.route('/authorize', methods=['POST'])
def authorize():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    #HASH PASSWORD
    table_name = email.split('@')[0]
    h = hashlib.new("SHA256")
    user_pass_salt = password + table_name + password + (table_name + 'salthash')  # salt for hash
    h.update(user_pass_salt.encode())  
    password = h.hexdigest()   # hash pass

    result = authorize_user(email, password)
    if result.get('success'):
        # Сохраняем информацию о пользователе в сессии
        session['user'] = {'email': email, 'table_name': table_name}
        return jsonify({'success': True, 'user': session['user']})
    else:
        return jsonify({'success': False, 'message': 'Invalid credentials'})

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    #HASH PASSWORD
    table_name = email.split('@')[0]
    h = hashlib.new("SHA256")
    user_pass_salt = password + table_name + password + (table_name + 'salthash')  # salt for hash
    h.update(user_pass_salt.encode())  
    password = h.hexdigest()   # hash pass

    result = register_user(email, password)
    return jsonify(result)

@app.route('/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT * FROM users ORDER BY id;')
    users = cur.fetchall()
    cur.close()
    conn.close()
    
    users_list = [{'id': item[0], 'email': item[1], 'password': item[2], 'table_name': item[3]} for item in users]
    
    return jsonify(users_list)

@app.route('/items', methods=['GET'])
def get_items():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid table name'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    query = f'SELECT * FROM {table_name} ORDER BY id, category, product_type, product_name;'
    cur.execute(query)
    items = cur.fetchall()
    cur.close()
    conn.close()

    item_list = [{'id': item[0], 'product_name': item[1], 'category': item[2], 'product_type': item[3],
                  'unit': item[4], 'quantity': item[5], 'sold_quantity': item[6],
                  'status': item[7], 'cenaDPH': item[8], 'DPH': item[9], 'last_updated': item[10]} for item in items]

    return jsonify(item_list)


@app.route('/item', methods=['GET'])
def get_item():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid table name'}), 400

    product_name = request.args.get('product_name')
    if not product_name:
        return jsonify({'error': 'Product name is required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    query = f"SELECT * FROM {table_name} WHERE LOWER(product_name) = LOWER(%s);"
    cur.execute(query, (product_name,))
    item = cur.fetchone()
    cur.close()
    conn.close()

    if not item:
        return jsonify({'error': 'Item not found'}), 404

    return jsonify({
        'id': item[0],
        'product_name': item[1],
        'category': item[2],
        'product_type': item[3],
        'unit': item[4],
        'quantity': float(item[5]),
        'sold_quantity': float(item[6]),
        'status': item[7],
        'cenaDPH': float(item[8]),
        'DPH': item[9],
        'last_updated': item[10].isoformat() if item[10] else None
    })


# WebSocket для уведомлений об изменении базы
@socketio.on('update_items')
def update_items():
    socketio.emit('items_updated')  # Сообщаем клиенту, что нужно обновить список


@app.route('/new_item', methods=['POST'])
def create_item():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid table name'}), 400

    # Получаем данные из запроса
    data = request.get_json()

    # Извлекаем данные для новой складовой карты
    nazov = data.get('nazov')  
    pocet = data.get('pocet')  
    cena_s_dph = data.get('cena_s_dph')  
    cena_bez_dph = data.get('cena_bez_dph')  
    jednotka = data.get('jednotka')  
    kategoria = data.get('kategoria')

    # Проверка обязательных полей
    if not nazov or pocet is None or cena_s_dph is None or cena_bez_dph is None or not jednotka or not kategoria:
        return jsonify({'error': 'All fields are required.'}), 400

    # Рассчитываем значение DPH
    dph = ((cena_s_dph - cena_bez_dph) / cena_bez_dph) * 100
    dph = round(dph)

    dph_str = f"{int(dph)}%"  # Преобразуем в строку, например, "19%"

    status = 'available' if pocet > 0 else 'sold out'

    conn = get_db_connection()
    cur = conn.cursor()

    query = f"""
    INSERT INTO {table_name} (product_name, category, product_type, unit, quantity, sold_quantity, status, cenaDPH, DPH, last_updated, sale_quantity)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s)
    """
    cur.execute(query, (nazov, kategoria, 'None', jednotka, pocet, 0.00, status, cena_s_dph, dph_str, None))  
    conn.commit()
    cur.close()
    conn.close()

    socketio.emit('items_updated')

    return jsonify({'message': 'Item successfully created.'}), 201



@app.route('/create_new_polozka', methods=['POST'])
def create_new_polozka():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid table name'}), 400

    data = request.get_json()

    # Получаем данные из запроса
    nazov = data.get('nazov')
    kategoria = data.get('kategoria')
    jednotka = data.get('jednotka')
    dph = data.get('dph')

    if not nazov or not kategoria or not jednotka or not dph:
        return jsonify({'error': 'All fields are required'}), 400

    dph_str = f"{int(dph)}%"

    conn = get_db_connection()
    cur = conn.cursor()

    # Вставляем новую položku с начальными значениями
    query = f"""
    INSERT INTO {table_name} (product_name, category, product_type, unit, quantity, sold_quantity, status, cenaDPH, DPH, last_updated, sale_quantity)
    VALUES (%s, %s, %s, %s, 0.00, 0.00, 'available', 0.00, %s, CURRENT_TIMESTAMP, 0.00)
    """
    cur.execute(query, (nazov, kategoria, kategoria, jednotka, dph_str))
    conn.commit()
    cur.close()
    conn.close()

    socketio.emit('items_updated')

    return jsonify({'message': 'Polozka successfully created.'}), 201


@app.route('/api/naskladnenie', methods=['POST'])
def create_naskladnenie():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Neautorizovaný prístup'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'success': False, 'error': 'Nesprávny názov tabuľky'}), 400

    data = request.get_json()
    date = data.get('date')
    supplier = data.get('supplier')
    document_number = data.get('documentNumber')
    cenaDPH = data.get('cenaDPH')
    note = data.get('note')

    if not date:
        return jsonify({'success': False, 'error': 'Dátum je povinný'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(f"""
        INSERT INTO {table_name}_naskladnenie (date, supplier, document_number, cenaDPH, note)
        VALUES (%s, %s, %s, %s, %s) RETURNING id;
    """, (date, supplier, document_number, cenaDPH, note))

    naskladnenie_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({'success': True, 'id': naskladnenie_id})

@app.route('/api/naskladnenie_polozky', methods=['POST'])
def create_naskladnenie_polozka():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Neautorizovaný prístup'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'success': False, 'error': 'Nesprávny názov tabuľky'}), 400

    data = request.get_json()
    naskladnenie_id = data.get('naskladnenie_id')
    product_name = data.get('product_name')
    DPH = data.get('DPH')
    quantity = data.get('quantity')
    price_without_DPH = data.get('price_without_DPH')
    price_with_DPH = data.get('price_with_DPH')
    total_without_DPH = data.get('total_without_DPH')
    total_with_DPH = data.get('total_with_DPH')

    if not all([naskladnenie_id, product_name, quantity, price_without_DPH, price_with_DPH, total_without_DPH, total_with_DPH]):
        return jsonify({'success': False, 'error': 'Chýbajúce údaje'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(f"""
        INSERT INTO {table_name}_naskladnenie_polozky 
        (naskladnenie_id, product_name, DPH, quantity, price_without_DPH, price_with_DPH, total_without_DPH, total_with_DPH)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
    """, (naskladnenie_id, product_name, DPH, quantity, price_without_DPH, price_with_DPH, total_without_DPH, total_with_DPH))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({'success': True})

@app.route('/api/delete_naskladnenie_polozky', methods=['POST'])
def delete_naskladnenie_polozky():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'success': False, 'error': 'Invalid table name'}), 400

    data = request.get_json()
    naskladnenie_id = data.get('naskladnenie_id')

    if not naskladnenie_id:
        return jsonify({'success': False, 'error': 'Missing naskladnenie_id'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(f"DELETE FROM {table_name}_naskladnenie_polozky WHERE naskladnenie_id = %s", (naskladnenie_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        cur.close()
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/update_naskladnenie', methods=['POST'])
def update_naskladnenie():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'success': False, 'error': 'Invalid table name'}), 400

    data = request.get_json()
    naskladnenie_id = data.get('id')
    date = data.get('date')
    supplier = data.get('supplier')
    document_number = data.get('documentNumber')
    cenaDPH = data.get('cenaDPH')
    note = data.get('note')

    if not naskladnenie_id:
        return jsonify({'success': False, 'error': 'Missing naskladnenie_id'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(f"""
            UPDATE {table_name}_naskladnenie
            SET date = %s, supplier = %s, document_number = %s, cenaDPH = %s, note = %s
            WHERE id = %s;
        """, (date, supplier, document_number, cenaDPH, note, naskladnenie_id))

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        cur.close()
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/search_supplier', methods=['GET'])
def search_supplier():
    query = request.args.get('query', '').strip()
    if not query:
        print("Query is empty")
        return jsonify([])

    user = session.get('user')
    if not user:
        print("User session not found")
        return jsonify([])

    table_name = user.get('table_name')
    if not table_name:
        print("Table name is missing")
        return jsonify([])

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(f"""
        SELECT DISTINCT supplier 
        FROM {table_name}_naskladnenie 
        WHERE supplier ILIKE %s 
        LIMIT 10
    """, (f"%{query}%",))
    
    suppliers = [row[0] for row in cur.fetchall()]

    cur.close()
    conn.close()

    return jsonify(suppliers)



@app.route('/update_item', methods=['POST'])
def update_item():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid table name'}), 400

    data = request.get_json()
    old_product_name = data.get('old_product_name')
    new_product_name = data.get('new_product_name')
    category = data.get('category')
    unit = data.get('unit')
    quantity = round(float(data.get('quantity', 0)), 2)
    cenaDPH = data.get('cenaDPH')
    cenaBezDPH = data.get('cenaBezDPH')
    DPH = data.get('DPH')
    dph_str = f"{int(DPH)}%"  # Преобразуем в строку, например, "19%"

    if not old_product_name:
        return jsonify({'error': 'Original product name is required'}), 400

    if not new_product_name:
        new_product_name = old_product_name  # Если название не менялось, оставляем старое

    conn = get_db_connection()
    cur = conn.cursor()

    update_query = f"""
        UPDATE {table_name}
        SET product_name = %s, category = %s, unit = %s, quantity = %s, cenaDPH = %s, DPH = %s, last_updated = CURRENT_TIMESTAMP
        WHERE product_name = %s;
    """
    cur.execute(update_query, (new_product_name, category, unit, quantity, cenaDPH, dph_str, old_product_name))
    conn.commit()

    cur.close()
    conn.close()

    socketio.emit('items_updated')

    return jsonify({'success': True, 'updated_item': new_product_name})



@app.route('/categories_api', methods=['GET'])
def get_categories():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid table name'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    query = f'SELECT * FROM {table_name}_kategorie_skladovych_kariet ORDER BY id;'
    cur.execute(query)
    items = cur.fetchall()
    cur.close()
    conn.close()

    item_list = [{'id': item[0], 'category': item[1]} for item in items]

    return jsonify(item_list)

@app.route('/naskladnenie_api', methods=['GET'])
def get_naskladnenie():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid table name'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    query = f'SELECT * FROM {table_name}_naskladnenie ORDER BY id;'
    cur.execute(query)
    items = cur.fetchall()
    cur.close()
    conn.close()

    item_list = [{'id': item[0], 'date': item[1], 'supplier': item[2], 'document_number': item[3], 'cenadph': item[4], 'note': item[5]} for item in items]

    return jsonify(item_list)

@app.route('/api/get_naskladnenie_polozky', methods=['GET'])
def get_naskladnenie_polozky():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid table name'}), 400

    naskladnenie_id = request.args.get('naskladnenie_id')
    if not naskladnenie_id:
        return jsonify({'error': 'Missing naskladnenie_id'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(f"""
        SELECT product_name, DPH, quantity, price_without_DPH, price_with_DPH, total_without_DPH, total_with_DPH
        FROM {table_name}_naskladnenie_polozky
        WHERE naskladnenie_id = %s;
    """, (naskladnenie_id,))

    items = cur.fetchall()
    cur.close()
    conn.close()

    item_list = [
        {
            'name': item[0],
            'dph': int(item[1].replace('%', '')) if isinstance(item[1], str) and '%' in item[1] else int(item[1]),
            'quantity': float(item[2]),
            'priceWithoutDph': float(item[3]),
            'priceWithDph': float(item[4]),
            'totalPriceWithoutDph': float(item[5]),
            'totalPriceWithDph': float(item[6])
        }
        for item in items
    ]

    return jsonify(item_list)


@app.route('/delete_naskladnenie', methods=['POST'])
def delete_naskladnenie():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'success': False, 'error': 'Invalid table name'}), 400

    data = request.get_json()
    naskladnenie_id = data.get('naskladnenie_id')

    if not naskladnenie_id:
        return jsonify({'success': False, 'error': 'Missing naskladnenie_id'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(f"DELETE FROM {table_name}_naskladnenie WHERE id = %s", (naskladnenie_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        cur.close()
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/create_inventury', methods=['POST'])
def create_inventura():

    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'success': False, 'error': 'Invalid table name'}), 400

    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(f"""
        INSERT INTO {table_name}_inventury (date, note, cenaDPH) 
        VALUES (%s, %s, %s) RETURNING id;
    """, (data['date'], data['note'], data['cenaDPH']))

    inventura_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"success": True, "id": inventura_id})

@app.route('/api/create_inventury_polozky', methods=['POST'])
def create_inventura_polozky():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'success': False, 'error': 'Invalid table name'}), 400

    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()

    for item in data:
        cursor.execute(f"""
            INSERT INTO {table_name}_inventury_polozky 
            (inventury_id, product_name, category, oldQuantity, actualQuantity, differenceQuantity, differencePrice) 
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """, (
            item['inventury_id'],
            item['product_name'],
            item['category'],
            item['oldQuantity'],
            item['actualQuantity'],
            item['differenceQuantity'],
            item['differencePrice']
        ))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"success": True})

@app.route('/api/get_inventura_polozky', methods=['GET'])
def get_inventura_polozky():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'success': False, 'error': 'Invalid table name'}), 400

    inventura_id = request.args.get('inventura_id')
    if not inventura_id:
        return jsonify({'success': False, 'error': 'Missing inventura_id'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT product_name, category, oldQuantity, actualQuantity, differenceQuantity, differencePrice
        FROM {table_name}_inventury_polozky
        WHERE inventury_id = %s;
    """, (inventura_id,))

    rows = cursor.fetchall()

    result = [
        {
            'product_name': row[0],
            'category': row[1],
            'oldQuantity': float(row[2]),
            'actualQuantity': float(row[3]),
            'differenceQuantity': float(row[4]),
            'differencePrice': float(row[5])
        }
        for row in rows
    ]

    cursor.close()
    conn.close()

    return jsonify(result)


@app.route('/api/inventura', methods=['GET'])
def get_inventura():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'success': False, 'error': 'Invalid table name'}), 400

    inventura_id = request.args.get('id')
    if not inventura_id:
        return jsonify({'success': False, 'error': 'Missing inventura_id'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT date, note, cenaDPH
        FROM {table_name}_inventury
        WHERE id = %s;
    """, (inventura_id,))

    row = cursor.fetchone()
    
    if not row:
        return jsonify({'success': False, 'error': 'Inventura not found'}), 404

    result = {
        'date': row[0].isoformat(),
        'note': row[1] if row[1] else "",
        'cenaDPH': float(row[2]) if row[2] is not None else 0.00
    }


    cursor.close()
    conn.close()

    return jsonify(result)

@app.route('/api/update_inventura', methods=['POST'])
def update_inventura():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'success': False, 'error': 'Invalid table name'}), 400

    inventury_table = f"{table_name}_inventury"
    inventury_polozky_table = f"{table_name}_inventury_polozky"

    data = request.json
    inventura_id = data.get('id')
    date = data.get('date')
    note = data.get('note')
    cenaDPH = data.get('cenaDPH')
    polozky = data.get('polozky')

    if not inventura_id or not date:
        return jsonify({'success': False, 'error': 'Missing required data'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Откатить старые количества в {table_name}
        cursor.execute(f"""
            SELECT product_name, oldQuantity FROM {inventury_polozky_table}
            WHERE inventury_id = %s;
        """, (inventura_id,))
        old_items = cursor.fetchall()

        for item in old_items:
            cursor.execute(f"""
                UPDATE {table_name}
                SET quantity = %s
                WHERE product_name = %s;
            """, (item[1], item[0]))

        # 2. Удалить старые položky из inventury_polozky
        cursor.execute(f"""
            DELETE FROM {inventury_polozky_table} WHERE inventury_id = %s;
        """, (inventura_id,))

        # 3. Обновить дату и заметку в inventury
        cursor.execute(f"""
            UPDATE {inventury_table}
            SET date = %s, note = %s, cenaDPH = %s
            WHERE id = %s;
        """, (date, note, cenaDPH, inventura_id))

        # 4. Вставить новые položky
        for item in polozky:
            cursor.execute(f"""
                INSERT INTO {inventury_polozky_table} 
                (inventury_id, product_name, oldQuantity, actualQuantity, differenceQuantity, differencePrice) 
                VALUES (%s, %s, %s, %s, %s, %s);
            """, (
                inventura_id,
                item['product_name'],
                item['oldQuantity'],
                item['actualQuantity'],
                item['differenceQuantity'],
                item['differencePrice']
            ))

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": True})

    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/inventury_api', methods=['GET'])
def get_inventury():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'success': False, 'error': 'Invalid table name'}), 400

    inventury_table = f"{table_name}_inventury"

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(f"""
            SELECT id, date, cenaDPH, note FROM {inventury_table} ORDER BY date DESC;
        """)
        rows = cursor.fetchall()

        result = [
            {
                'id': row[0],
                'date': row[1].isoformat(),
                'cenaDPH': float(row[2]) if row[2] else 0.00,
                'note': row[3] if row[3] else ""
            }
            for row in rows
        ]

        cursor.close()
        conn.close()

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/search_polozka', methods=['GET'])
def search_polozka():
    user = session.get('user')
    if not user:
        return jsonify([])

    table_name = user.get('table_name')
    if not table_name:
        return jsonify([])

    query = request.args.get('query', '').strip().lower()

    if not query:
        return jsonify([])

    conn = get_db_connection()
    cur = conn.cursor()

    sql_query = f"SELECT product_name FROM {table_name} WHERE LOWER(product_name) LIKE %s;"
    cur.execute(sql_query, (f"%{query}%",))
    results = cur.fetchall()

    cur.close()
    conn.close()

    found_items = [row[0] for row in results]

    return jsonify(found_items)


@app.route('/get_polozka_data', methods=['GET'])
def get_polozka_data():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid table name'}), 400

    polozka_name = request.args.get('name')
    if not polozka_name:
        return jsonify({'error': 'Product name is required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    query = f"""
        SELECT product_name, DPH, unit, cenaDPH
        FROM {table_name} 
        WHERE LOWER(product_name) = LOWER(%s)
        LIMIT 1;
    """
    cur.execute(query, (polozka_name,))
    item = cur.fetchone()
    cur.close()
    conn.close()

    if not item:
        return jsonify({'error': 'Item not found'}), 404

    return jsonify({
        'product_name': item[0],
        'dph': item[1],
        'unit': item[2],
        'cenaDPH': float(item[3])
    })




@app.route('/add_category', methods=['POST'])
def add_category():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid user'}), 400

    data = request.get_json()
    new_category = data.get('category')

    if not new_category or not new_category.strip():
        return jsonify({'error': 'Category name cannot be empty'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    check_query = f"SELECT 1 FROM {table_name}_kategorie_skladovych_kariet WHERE category = %s;"
    cur.execute(check_query, (new_category,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'error': 'Category already exists'}), 409

    # Добавление новой категории
    insert_query = f"INSERT INTO {table_name}_kategorie_skladovych_kariet (category) VALUES (%s);"
    cur.execute(insert_query, (new_category,))
    conn.commit()

    cur.close()
    conn.close()

    return jsonify({'success': True, 'category': new_category})

@app.route('/delete_category', methods=['POST'])
def delete_category():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid user'}), 400

    data = request.get_json()
    delete_category = data.get('category')

    if not delete_category:
        return jsonify({'error': 'Category name is required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # Проверяем, существует ли категория
    check_query = f"SELECT 1 FROM {table_name}_kategorie_skladovych_kariet WHERE category = %s;"
    cur.execute(check_query, (delete_category,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'error': 'Category not found'}), 404

    # Удаляем категорию
    delete_query = f"DELETE FROM {table_name}_kategorie_skladovych_kariet WHERE category = %s;"
    cur.execute(delete_query, (delete_category,))
    conn.commit()

    cur.close()
    conn.close()

    return jsonify({'success': True, 'deleted_category': delete_category})



@app.route('/delete_item', methods=['POST'])
def delete_item():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid user'}), 400

    data = request.get_json()
    delete_item = data.get('product_name')

    if not delete_item:
        return jsonify({'error': "Product's name is required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # Проверяем, существует ли этот товар
    check_query = f"SELECT 1 FROM {table_name} WHERE LOWER(product_name) = LOWER(%s);"
    cur.execute(check_query, (delete_item,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'error': 'Item not found'}), 404

    # Удаляем товар
    delete_query = f"DELETE FROM {table_name} WHERE LOWER(product_name) = LOWER(%s);"
    cur.execute(delete_query, (delete_item,))
    conn.commit()

    cur.close()
    conn.close()

    socketio.emit('items_updated')

    return jsonify({'success': True, 'deleted_item': delete_item})




@app.route('/export_categories_csv', methods=['GET'])
def export_categories_csv():
    # Проверяем авторизацию пользователя
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    if not table_name:
        return jsonify({'error': 'Invalid user'}), 400

    # Подключаемся к базе данных и извлекаем данные
    conn = get_db_connection()
    cur = conn.cursor()

    query = f"SELECT id, category FROM {table_name}_kategorie_skladovych_kariet ORDER BY id;"
    cur.execute(query)
    rows = cur.fetchall()

    cur.close()
    conn.close()

    # Генерируем CSV-файл
    output = StringIO()
    writer = csv.writer(output, delimiter=';', quotechar='"', quoting=csv.QUOTE_MINIMAL)

    # Пишем заголовки
    writer.writerow(['ID', 'Category'])

    # Записываем строки данных
    for row in rows:
        writer.writerow(row)

    output.seek(0)

    # Возвращаем CSV как скачиваемый файл
    response = Response(output.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = 'attachment; filename=categories.csv'
    return response

@app.route('/api/profile_data')
def get_profile_data():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    email = user.get('email')

    if not table_name or not email:
        return jsonify({'success': False, 'error': 'Invalid session'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"""
        SELECT first_name, last_name, username, avatar_path, email
        FROM {table_name}_profile
        WHERE email = %s
    """, (email,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if row:
        return jsonify({'success': True, 'profile': {
            'first_name': row[0],
            'last_name': row[1],
            'username': row[2],
            'avatar_path': row[3],
            'email': row[4]
        }})
    else:
        return jsonify({'success': False, 'error': 'Profile not found'}), 404
    

@app.route('/api/upload_avatar', methods=['POST'])
def upload_avatar():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    email = user.get('email')
    if not table_name or not email:
        return jsonify({'success': False, 'error': 'Invalid session'}), 400

    if 'avatar' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'}), 400

    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Empty filename'}), 400
    
    if file.mimetype not in ALLOWED_MIME_TYPES:
        return jsonify({'success': False, 'error': 'Nepodporovaný formát obrázka (povolené: JPG, PNG, GIF)'}), 400

    filename = secure_filename(f"{table_name}.jpg")
    save_path = os.path.join("static", "Components", "avatars", filename)

    try:
        file.save(save_path)

        avatar_url = f"/static/Components/avatars/{filename}"

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"""
            UPDATE {table_name}_profile
            SET avatar_path = %s
            WHERE email = %s
        """, (avatar_url, email))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'avatar_path': avatar_url})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    
@app.route('/api/delete_avatar', methods=['POST'])
def delete_avatar():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    email = user.get('email')
    if not table_name or not email:
        return jsonify({'success': False, 'error': 'Invalid session'}), 400

    filename = f"{table_name}.jpg"
    avatar_path = os.path.join("static", "Components", "avatars", filename)

    # Видаляємо файл, якщо він існує
    if os.path.exists(avatar_path):
        try:
            os.remove(avatar_path)
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    # Скидаємо шлях до дефолтного
    default_avatar = "/static/Components/assets/empty_profile_logo.jpg"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"""
        UPDATE {table_name}_profile
        SET avatar_path = %s
        WHERE email = %s
    """, (default_avatar, email))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'success': True, 'avatar_path': default_avatar})

@app.route('/api/update_profile', methods=['POST'])
def update_profile():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    email = user.get('email')
    if not table_name or not email:
        return jsonify({'success': False, 'error': 'Invalid session'}), 400

    data = request.get_json()
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    username = data.get('username', '').strip()

    if not first_name or not username:
        return jsonify({'success': False, 'error': 'Meno a užívateľské meno sú povinné'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"""
        UPDATE {table_name}_profile
        SET first_name = %s, last_name = %s, username = %s
        WHERE email = %s
    """, (first_name, last_name, username, email))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'success': True})

@app.route('/api/change_email', methods=['POST'])
def change_email():
    import re

    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    old_email = request.json.get('old_email', '').strip()
    new_email = request.json.get('new_email', '').strip()

    old_table = user.get('table_name')
    old_session_email = user.get('email')
    new_table = new_email.split('@')[0]

    if old_email != old_session_email:
        return jsonify({'success': False, 'error': 'Starý email nezodpovedá aktuálnemu'}), 400

    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', new_email):
        return jsonify({'success': False, 'error': 'Neplatný email'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Перевірити, чи новий email вже існує
    cursor.execute("SELECT 1 FROM users WHERE email = %s", (new_email,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({'success': False, 'error': 'Email už existuje'}), 400

    try:
        # 1. Перейменування таблиць
        tables = ["", "_inventury", "_inventury_polozky", "_kategorie_skladovych_kariet", "_naskladnenie", "_naskladnenie_polozky", "_profile"]
        for suffix in tables:
            cursor.execute(f"ALTER TABLE {old_table}{suffix} RENAME TO {new_table}{suffix};")

        # 2. Оновлення users
        cursor.execute("""
            UPDATE users SET email = %s, table_name = %s WHERE email = %s
        """, (new_email, new_table, old_email))

        # 3. Оновлення профілю
        cursor.execute(f"""
            SELECT first_name, username, avatar_path FROM {new_table}_profile WHERE email = %s
        """, (old_email,))
        profile = cursor.fetchone()

        if profile:
            new_first = new_table if profile[0] == old_table else profile[0]
            new_username = new_table if profile[1] == old_table else profile[1]
            new_avatar_path = profile[2].replace(f"/{old_table}.jpg", f"/{new_table}.jpg") if profile[2] else None

            cursor.execute(f"""
                UPDATE {new_table}_profile 
                SET email = %s, first_name = %s, username = %s, avatar_path = %s 
                WHERE email = %s
            """, (new_email, new_first, new_username, new_avatar_path, old_email))

            # Перейменувати файл аватарки (якщо існує)
            old_path = os.path.join("static", "Components", "avatars", f"{old_table}.jpg")
            new_path = os.path.join("static", "Components", "avatars", f"{new_table}.jpg")
            if os.path.exists(old_path):
                os.rename(old_path, new_path)

        conn.commit()

        # Оновлюємо сесію
        session['user']['email'] = new_email
        session['user']['table_name'] = new_table

        return jsonify({'success': True, 'message': 'Email úspešne zmenený'})

    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/change_password', methods=['POST'])
def change_password():
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    table_name = user.get('table_name')
    email = user.get('email')

    if not table_name or not email:
        return jsonify({'success': False, 'error': 'Invalid session'}), 400

    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    repeat_password = data.get('repeat_password')

    if not old_password or not new_password or not repeat_password:
        return jsonify({'success': False, 'error': 'Všetky polia sú povinné'}), 400

    if new_password != repeat_password:
        return jsonify({'success': False, 'error': 'Nové heslá sa nezhodujú'}), 400

    # Хешуємо старий пароль
    h = hashlib.new("SHA256")
    old_salted = old_password + table_name + old_password + (table_name + 'salthash')
    h.update(old_salted.encode())
    old_hashed = h.hexdigest()

    # Перевіряємо, чи старий пароль правильний
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT password FROM users WHERE email = %s", (email,))
    row = cursor.fetchone()

    if not row or row[0] != old_hashed:
        cursor.close()
        conn.close()
        return jsonify({'success': False, 'error': 'Nesprávne staré heslo'}), 400

    # Хешуємо новий пароль
    h = hashlib.new("SHA256")
    new_salted = new_password + table_name + new_password + (table_name + 'salthash')
    h.update(new_salted.encode())
    new_hashed = h.hexdigest()

    # Зберігаємо новий пароль
    cursor.execute("UPDATE users SET password = %s WHERE email = %s", (new_hashed, email))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'success': True, 'message': 'Heslo bolo úspešne zmenené'})