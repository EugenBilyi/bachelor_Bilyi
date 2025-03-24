import psycopg2
from backend.config import DATABASE

def get_db_connection():
    conn = psycopg2.connect(**DATABASE)
    return conn