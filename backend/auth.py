# from flask import jsonify
from db import get_db_connection
from db_create import create_tables
# from werkzeug.security import generate_password_hash, check_password_hash


def authorize_user(email, password):
    table_name = email.split('@')[0]
    conn = get_db_connection()
    cursor = conn.cursor()

    # Проверка существования пользователя
    cursor.execute("SELECT password FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()

    if user is None:
        return {"success": False, "message": "User does not exist."}

    # Проверка правильности пароля
    stored_password = user[0]
    if password != stored_password:
        return {"success": False, "message": "Incorrect password."}

    create_tables(table_name)

    conn.commit
    cursor.close()
    conn.close()
    return {"success": True}

def register_user(email, password):
    table_name = email.split('@')[0]
    conn = get_db_connection()
    cursor = conn.cursor()

    #  # Хеширование пароля с использованием функции werkzeug.security
    # hashed_password = generate_password_hash(password)

    cursor.execute(
        """CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(100) NOT NULL, -- пароли должны быть захешированы
            table_name VARCHAR(100) NOT NULL -- имя таблицы, которую этот пользователь может видеть
        );"""
    )

    # Проверка, есть ли пользователь с таким email
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()

    if user:
        return {"success": False, "message": "User with this email already exists."}

    cursor.execute(
        "INSERT INTO users (email, password, table_name) VALUES (%s, %s, %s)",
        (email, password, table_name)
    )

    create_tables(table_name)


    conn.commit()
    cursor.close()
    conn.close()

    return {"success": True}
