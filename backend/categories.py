from backend.db import get_db_connection

def create_skladove_karty(table_name):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Проверка существования таблицы
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = %s
        );
    """, (table_name,))

    table_exists = cursor.fetchone()[0]

    if not table_exists:
        cursor.close()
        conn.close()
        return

    # Если таблица существует, выполняем запрос
    cursor.execute(f"SELECT DISTINCT category FROM {table_name};")
    existCategoriesSklad = [row[0] for row in cursor.fetchall()]

    table_categories = table_name+'_kategorie_skladovych_kariet'
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = %s
        );
    """, (table_categories,))

    table2_exists = cursor.fetchone()[0]

    if not table2_exists:
        cursor.close()
        conn.close()
        return
    
    cursor.execute(f"SELECT DISTINCT category FROM {table_categories};")
    existCategoriesSkladoveKarty = [row[0] for row in cursor.fetchall()]

    newCategories = list(set(existCategoriesSklad) - set(existCategoriesSkladoveKarty))

    for i in newCategories:
        cursor.execute(f"""INSERT INTO {table_categories} (category) VALUES (%s)""", (i,))


    conn.commit()
    cursor.close()
    conn.close()