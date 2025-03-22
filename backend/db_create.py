from db import get_db_connection
from categories import create_skladove_karty

def create_triggers_and_functions(table_name):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Проверка и создание функции для обновления last_updated
    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_proc 
            WHERE proname = 'update_last_updated'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(
            f"""
            CREATE OR REPLACE FUNCTION update_last_updated()
                RETURNS TRIGGER AS $$
            BEGIN
                NEW.last_updated := NOW() AT TIME ZONE 'Europe/Prague';
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """
        )

    # Проверка существования триггера для last_updated
    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_trigger 
            WHERE tgname = 'update_last_updated_trigger' 
            AND tgrelid = '{table_name}'::regclass
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(
            f"""
            CREATE TRIGGER update_last_updated_trigger
                BEFORE INSERT OR UPDATE ON {table_name}
                FOR EACH ROW EXECUTE FUNCTION update_last_updated();
            """
        )

    # Проверка и создание функции для обновления статуса продукта
    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_proc 
            WHERE proname = 'update_product_status'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(
            f"""
            CREATE OR REPLACE FUNCTION update_product_status()
                RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.quantity > 0 THEN
                    NEW.status := 'available';
                ELSE
                    NEW.status := 'sold out';
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """
        )

    # Проверка существования триггера для статуса продукта
    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_trigger 
            WHERE tgname = 'update_status_trigger' 
            AND tgrelid = '{table_name}'::regclass
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(
            f"""
            CREATE TRIGGER update_status_trigger
                BEFORE INSERT OR UPDATE ON {table_name}
                FOR EACH ROW EXECUTE FUNCTION update_product_status();
            """
        )

    # Проверка и создание функции для обновления проданного объема
    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_proc 
            WHERE proname = 'update_sold_quantity'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(
            f"""
            CREATE OR REPLACE FUNCTION update_sold_quantity()
                RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.category = 'Alkohol' THEN
                    IF NEW.sale_quantity <= 0 OR NEW.sale_quantity > NEW.quantity THEN
                        RAISE EXCEPTION 'Invalid sale quantity';
                    END IF;
                    NEW.quantity := NEW.quantity - NEW.sale_quantity;
                    NEW.sold_quantity := NEW.sold_quantity + NEW.sale_quantity;
                ELSE
                    IF NEW.sale_quantity <= 0 OR NEW.sale_quantity > NEW.quantity OR NEW.sale_quantity != FLOOR(NEW.sale_quantity) THEN
                        RAISE EXCEPTION 'Invalid sale quantity for non-alcoholic drink. Sale quantity must be a positive integer';
                    END IF;
                    NEW.quantity := NEW.quantity - NEW.sale_quantity;
                    NEW.sold_quantity := NEW.sold_quantity + NEW.sale_quantity;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """
        )

    # Проверка существования триггера для проданного объема
    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_trigger 
            WHERE tgname = 'sold_quantity_trigger' 
            AND tgrelid = '{table_name}'::regclass
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(
            f"""
            CREATE TRIGGER sold_quantity_trigger
                BEFORE UPDATE ON {table_name}
                FOR EACH ROW EXECUTE FUNCTION update_sold_quantity();
            """
        )

    conn.commit()
    cursor.close()
    conn.close()




    


def create_category_update_trigger(table_name):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Имя таблицы для категорий
    table_categories = f"{table_name}_kategorie_skladovych_kariet"

    # Проверка и создание функции для обновления категорий
    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_proc 
            WHERE proname = 'update_category_table'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(f"""
            CREATE OR REPLACE FUNCTION update_category_table()
                RETURNS TRIGGER AS $$
            BEGIN
                -- Проверяем, существует ли категория в таблице категорий
                IF NOT EXISTS (
                    SELECT 1 FROM {table_categories} WHERE category = NEW.category
                ) THEN
                    -- Если не существует, добавляем новую категорию
                    INSERT INTO {table_categories} (category) VALUES (NEW.category);
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)

    # Проверка существования триггера для обновления категорий
    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_trigger 
            WHERE tgname = 'update_categories_trigger' 
            AND tgrelid = '{table_name}'::regclass
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(f"""
            CREATE TRIGGER update_categories_trigger
            AFTER INSERT OR UPDATE ON {table_name}
            FOR EACH ROW
            EXECUTE FUNCTION update_category_table();
        """)

    conn.commit()
    cursor.close()
    conn.close()


def create_update_price_trigger(table_name):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'update_price_on_insert'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(f"""
            CREATE OR REPLACE FUNCTION update_price_on_insert()
            RETURNS TRIGGER AS $$
            BEGIN
                UPDATE {table_name}
                SET 
                    quantity = quantity + NEW.quantity,
                    cenaDPH = ((quantity * cenaDPH) + (NEW.quantity * NEW.price_with_DPH)) / (quantity + NEW.quantity)
                WHERE product_name = NEW.product_name;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)

    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_price_on_insert'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(f"""
            CREATE TRIGGER trg_update_price_on_insert
            AFTER INSERT ON {table_name}_naskladnenie_polozky
            FOR EACH ROW
            EXECUTE FUNCTION update_price_on_insert();
        """)

    conn.commit()
    cursor.close()
    conn.close()


def create_restore_price_trigger(table_name):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'restore_price_on_delete'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(f"""
            CREATE OR REPLACE FUNCTION restore_price_on_delete()
            RETURNS TRIGGER AS $$
            DECLARE 
                previous_price DECIMAL(7,2);
                previous_quantity DECIMAL(7,2);
            BEGIN
                -- Считаем среднюю цену товара без удаленного `naskladnenie_polozky`
                SELECT 
                    SUM(quantity) AS total_quantity, 
                    SUM(price_with_DPH * quantity) / NULLIF(SUM(quantity), 0) AS avg_price
                INTO previous_quantity, previous_price
                FROM {table_name}_naskladnenie_polozky
                WHERE product_name = OLD.product_name AND naskladnenie_id != OLD.naskladnenie_id;

                -- Если это было единственное поступление, возвращаем последнюю цену, а количество ставим 0
                IF previous_quantity IS NULL THEN
                    previous_quantity := 0;
                    SELECT cenaDPH INTO previous_price FROM {table_name} WHERE product_name = OLD.product_name;
                END IF;

                -- Обновляем количество и цену в главной таблице
                UPDATE {table_name}
                SET 
                    quantity = quantity - OLD.quantity,
                    cenaDPH = previous_price
                WHERE product_name = OLD.product_name;

                RETURN OLD;
            END;
            $$ LANGUAGE plpgsql;
        """)

    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'trg_restore_price_on_delete'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(f"""
            CREATE TRIGGER trg_restore_price_on_delete
            AFTER DELETE ON {table_name}_naskladnenie_polozky
            FOR EACH ROW
            EXECUTE FUNCTION restore_price_on_delete();
        """)

    conn.commit()
    cursor.close()
    conn.close()



def create_delete_naskladnenie_trigger(table_name):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'delete_related_polozky_on_naskladnenie_delete'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(f"""
            CREATE OR REPLACE FUNCTION delete_related_polozky_on_naskladnenie_delete()
            RETURNS TRIGGER AS $$
            BEGIN
                DELETE FROM {table_name}_naskladnenie_polozky 
                WHERE naskladnenie_id = OLD.id;
                RETURN OLD;
            END;
            $$ LANGUAGE plpgsql;
        """)

    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'trg_delete_polozky_on_naskladnenie_delete'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(f"""
            CREATE TRIGGER trg_delete_polozky_on_naskladnenie_delete
            BEFORE DELETE ON {table_name}_naskladnenie
            FOR EACH ROW
            EXECUTE FUNCTION delete_related_polozky_on_naskladnenie_delete();
        """)

    conn.commit()
    cursor.close()
    conn.close()


def create_restore_quantity_trigger(table_name):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'restore_quantity_on_naskladnenie_polozky_delete'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(f"""
            CREATE OR REPLACE FUNCTION restore_quantity_on_naskladnenie_polozky_delete()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Проверяем, не выполняется ли этот триггер в результате удаления naskladnenie
                IF NOT EXISTS (
                    SELECT 1 FROM {table_name}_naskladnenie WHERE id = OLD.naskladnenie_id
                ) THEN
                    -- Уменьшаем количество в sklad, только если naskladnenie уже удалено
                    UPDATE {table_name}
                    SET quantity = quantity - OLD.quantity
                    WHERE product_name = OLD.product_name;
                END IF;

                RETURN OLD;
            END;
            $$ LANGUAGE plpgsql;
        """)

    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'trg_restore_quantity_on_naskladnenie_polozky_delete'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(f"""
            CREATE TRIGGER trg_restore_quantity_on_naskladnenie_polozky_delete
            AFTER DELETE ON {table_name}_naskladnenie_polozky
            FOR EACH ROW
            EXECUTE FUNCTION restore_quantity_on_naskladnenie_polozky_delete();
        """)

    conn.commit()
    cursor.close()
    conn.close()

def create_update_quantity_trigger(table_name):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'update_quantity_on_inventura'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(f"""
            CREATE OR REPLACE FUNCTION update_quantity_on_inventura()
            RETURNS TRIGGER AS $$ 
            BEGIN
                UPDATE {table_name}
                SET quantity = NEW.actualQuantity
                WHERE product_name = NEW.product_name;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)

    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_quantity_on_inventura'
        );
    """)
    if not cursor.fetchone()[0]:
        cursor.execute(f"""
            CREATE TRIGGER trg_update_quantity_on_inventura
            AFTER INSERT ON {table_name}_inventury_polozky
            FOR EACH ROW
            EXECUTE FUNCTION update_quantity_on_inventura();
        """)

    conn.commit()
    cursor.close()
    conn.close()


def create_inventury_tables(table_name):
    conn = get_db_connection()
    cursor = conn.cursor()

    inventury_table = f"{table_name}_inventury"
    inventury_polozky_table = f"{table_name}_inventury_polozky"

    # Создание таблицы inventury
    cursor.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {inventury_table} (
            id SERIAL PRIMARY KEY,
            date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            cenaDPH DECIMAL(9,2),
            note VARCHAR(120)
        );
        """
    )

    # Создание таблицы inventury_polozky
    cursor.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {inventury_polozky_table} (
            id SERIAL PRIMARY KEY,
            inventury_id INTEGER NOT NULL,
            product_name VARCHAR(100) NOT NULL,
            category VARCHAR(50),
            oldQuantity DECIMAL(7,2) NOT NULL,
            actualQuantity DECIMAL(7,2) NOT NULL,
            differenceQuantity DECIMAL(7,2) NOT NULL,
            differencePrice DECIMAL(9,2) NOT NULL,
            FOREIGN KEY (inventury_id) REFERENCES {inventury_table}(id) ON DELETE CASCADE
        );
        """
    )

    conn.commit()
    cursor.close()
    conn.close()



def create_tables(table_name):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Создание таблицы для конкретного пользователя
    cursor.execute(
        f"""
            CREATE TABLE IF NOT EXISTS {table_name} (
            id SERIAL PRIMARY KEY,
            product_name VARCHAR(100) NOT NULL,
            category VARCHAR(50),
            product_type VARCHAR(50),
            unit VARCHAR(20),
            quantity DECIMAL(7,2) DEFAULT 0,
            sold_quantity DECIMAL(7,2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'available',
            cenaDPH DECIMAL(7,2) DEFAULT 0,
            DPH VARCHAR(20),
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sale_quantity DECIMAL(7,2)
        );
        """
    )

    create_triggers_and_functions(table_name)

    kategorie_table_name = table_name+'_kategorie_skladovych_kariet'

    # Создание таблицы категорий складских карт
    cursor.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {kategorie_table_name}(
            id SERIAL PRIMARY KEY,
            category VARCHAR(50) NOT NULL
        );
        """
    )

    naskladnenie_table_name = f"{table_name}_naskladnenie"
    cursor.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {naskladnenie_table_name} (
            id SERIAL PRIMARY KEY,
            date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            supplier VARCHAR(70),
            document_number VARCHAR(15) CHECK (document_number ~ '^[0-9]{{1,15}}$'),
            cenaDPH DECIMAL(7,2),
            note VARCHAR(120)
        );
        """
    )

    naskladnenie_polozky_table = f"{table_name}_naskladnenie_polozky"
    cursor.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {naskladnenie_polozky_table} (
            id SERIAL PRIMARY KEY,
            naskladnenie_id INTEGER NOT NULL,
            product_name VARCHAR(100) NOT NULL,
            DPH VARCHAR(10),
            quantity DECIMAL(7,2) NOT NULL,
            price_without_DPH DECIMAL(7,2) NOT NULL,
            price_with_DPH DECIMAL(7,2) NOT NULL,
            total_without_DPH DECIMAL(7,2) NOT NULL,
            total_with_DPH DECIMAL(7,2) NOT NULL,
            FOREIGN KEY (naskladnenie_id) REFERENCES {naskladnenie_table_name}(id) ON DELETE CASCADE
        );
        """
    )


    create_category_update_trigger(table_name)    
    create_skladove_karty(table_name)
    create_inventury_tables(table_name)

    conn.commit()
    cursor.close()
    conn.close()


    create_update_price_trigger(table_name)
    create_restore_price_trigger(table_name)
    create_delete_naskladnenie_trigger(table_name)
    create_restore_quantity_trigger(table_name)
    create_update_quantity_trigger(table_name)