DROP TABLE if exists sklad;
CREATE TABLE IF NOT EXISTS sklad (
     id SERIAL PRIMARY KEY,
     product_name VARCHAR(100),
     category VARCHAR(50),
     product_type VARCHAR(50),
     unit VARCHAR(20),  -- Литры для алкоголя, штуки для безалкогольных
     quantity DECIMAL(7,2),  -- Количество в литрах или штуках
     sold_quantity DECIMAL(7,2) DEFAULT 0,  -- Общий объем проданного товара в литрах или штуках
     status VARCHAR(20) DEFAULT 'available', -- Статус продукта (available, sold out)
     last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE sklad ADD COLUMN sale_quantity DECIMAL(7,2);  -- Поле для хранения объема продажи

CREATE OR REPLACE FUNCTION update_last_updated()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated := NOW() AT TIME ZONE 'Europe/Prague';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_updated_trigger
    BEFORE INSERT OR UPDATE ON sklad
    FOR EACH ROW EXECUTE FUNCTION update_last_updated();




-- Функция для обновления статуса
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

-- Триггер для обновления статуса
CREATE TRIGGER update_status_trigger
    BEFORE INSERT OR UPDATE ON sklad
    FOR EACH ROW EXECUTE FUNCTION update_product_status();

-- Функция для обновления проданного объема и статуса
CREATE OR REPLACE FUNCTION update_sold_quantity()
    RETURNS TRIGGER AS $$
BEGIN
    IF NEW.category = 'Alkohol' THEN
        -- Проверка объема продажи для алкогольных товаров
        IF NEW.sale_quantity <= 0 OR NEW.sale_quantity > NEW.quantity THEN
            RAISE EXCEPTION 'Invalid sale quantity';
        END IF;

        -- Обновление количества и проданного объема
        NEW.quantity := NEW.quantity - NEW.sale_quantity;
        NEW.sold_quantity := NEW.sold_quantity + NEW.sale_quantity;

    ELSE
        -- Проверка объема продажи для безалкогольных товаров
        IF NEW.sale_quantity <= 0 OR NEW.sale_quantity > NEW.quantity OR NEW.sale_quantity != FLOOR(NEW.sale_quantity) THEN
            RAISE EXCEPTION 'Invalid sale quantity for non-alcoholic drink. Sale quantity must be a positive integer';
        END IF;

        -- Обновление количества и проданного объема
        NEW.quantity := NEW.quantity - NEW.sale_quantity;
        NEW.sold_quantity := NEW.sold_quantity + NEW.sale_quantity;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления объема продаж
CREATE TRIGGER sold_quantity_trigger
    BEFORE UPDATE ON sklad
    FOR EACH ROW EXECUTE FUNCTION update_sold_quantity();


INSERT INTO sklad (product_name, category, product_type, unit, quantity)
VALUES
    --     Vodka
    ('Absolut', 'Alkohol', 'Vodka', 'litres', 6.0),
    ('Absolut citrus', 'Alkohol', 'Vodka', 'litres', 3.0),
    ('Absolut mango', 'Alkohol', 'Vodka', 'litres', 3.0),
    ('Absolut grep', 'Alkohol', 'Vodka', 'litres', 3.0),
    ('Absolut vanilla', 'Alkohol', 'Vodka', 'litres', 3.0),
    ('Finlandia', 'Alkohol', 'Vodka', 'litres', 5.0),
    ('Finlandia blackcurrant', 'Alkohol', 'Vodka', 'litres', 5.0),
    ('Finlandia coconut', 'Alkohol', 'Vodka', 'litres', 5.0),
    ('Beluga', 'Alkohol', 'Vodka', 'litres', 3.5),

    --     Tequila
    ('Ole silver', 'Alkohol', 'Tequila', 'litres', 4.2),
    ('Ole gold', 'Alkohol', 'Tequila', 'litres', 4.2),
    ('Olmeca silver', 'Alkohol', 'Tequila', 'litres', 2.8),
    ('Olmeca gold', 'Alkohol', 'Tequila', 'litres', 2.8),

    --     Cognac/brandy
    ('Metaxa', 'Alkohol', 'Cognac', 'litres', 1.4),
    ('Martell VSOP', 'Alkohol', 'Cognac', 'litres', 1.4),
    ('Hennesy VSOP', 'Alkohol', 'Cognac', 'litres', 1.4),

    --     Whiskey
    ('Tullamore Dew', 'Alkohol', 'Whiskey', 'litres', 3.0),
    ('Jameson', 'Alkohol', 'Whiskey', 'litres', 4.0),
    ('Jameson Caskmates', 'Alkohol', 'Whiskey', 'litres', 2.1),
    ('Jack Daniel`s', 'Alkohol', 'Whiskey', 'litres', 4.0),
    ('Jack Daniel`s Honey', 'Alkohol', 'Whiskey', 'litres', 6.0),
    ('Jack Daniel`s Fire', 'Alkohol', 'Whiskey', 'litres', 6.0),
    ('Jack Daniel`s Apple', 'Alkohol', 'Whiskey', 'litres', 6.0),
    ('Jack Daniel`s Gentleman', 'Alkohol', 'Whiskey', 'litres', 2.1),
    ('Bulleit Rye', 'Alkohol', 'Whiskey', 'litres', 1.4),

    --     Rum
    ('Captain Morgan', 'Alkohol', 'Rum', 'litres', 5.0),
    ('Malibu', 'Alkohol', 'Rum', 'litres', 2.1),
    ('Havana 3y', 'Alkohol', 'Rum', 'litres', 3.0),
    ('Bacardi Carta Blanca', 'Alkohol', 'Rum', 'litres', 4.0),
    ('Bacardi Carta Negra', 'Alkohol', 'Rum', 'litres', 2.8),
    ('Legendario', 'Alkohol', 'Rum', 'litres', 2.1),
    ('Pampero Aniversario', 'Alkohol', 'Rum', 'litres', 2.1),
    ('Belmont', 'Alkohol', 'Rum', 'litres', 3.0),
    ('Brugal 1888', 'Alkohol', 'Rum', 'litres', 2.1),
    ('Don Papa', 'Alkohol', 'Rum', 'litres', 2.1),
    ('Diplomatico 12y', 'Alkohol', 'Rum', 'litres', 2.1),
    ('Plantation XO', 'Alkohol', 'Rum', 'litres', 2.1),

    --     Gin
    ('Beefeater', 'Alkohol', 'Gin', 'litres', 7.0),
    ('Beefeater Pink', 'Alkohol', 'Gin', 'litres', 7.0),
    ('Bombay Sapphire', 'Alkohol', 'Gin', 'litres', 3.0),
    ('Malfy Gin', 'Alkohol', 'Gin', 'litres', 2.8),
    ('Malfy Gin con Limone', 'Alkohol', 'Gin', 'litres', 2.8),
    ('Malfy Gin Rosa', 'Alkohol', 'Gin', 'litres', 2.8),

    --     Liquer
    ('Bols Apricot Brandy', 'Alkohol', 'Liquer', 'litres', 2.8),
    ('Becherovka', 'Alkohol', 'Liquer', 'litres', 5.0),
    ('Kahlua', 'Alkohol', 'Liquer', 'litres', 2.8),
    ('Aperol', 'Alkohol', 'Liquer', 'litres', 4.0),
    ('Martini Dry', 'Alkohol', 'Liquer', 'litres', 1.5),
    ('Martini Bianco', 'Alkohol', 'Liquer', 'litres', 3.0),
    ('Martini Rosso', 'Alkohol', 'Liquer', 'litres', 4.0),
    ('Baileys', 'Alkohol', 'Liquer', 'litres', 2.8),
    ('Campari', 'Alkohol', 'Liquer', 'litres', 3.0),
    ('Galliano', 'Alkohol', 'Liquer', 'litres', 2.1),
    ('Midori', 'Alkohol', 'Liquer', 'litres', 2.1),
    ('Jägermeister', 'Alkohol', 'Liquer', 'litres', 4.0),
    ('Amaretto Disaronno', 'Alkohol', 'Liquer', 'litres', 2.1),
    ('Cointreau', 'Alkohol', 'Liquer', 'litres', 2.1),
    ('Absinth', 'Alkohol', 'Liquer', 'litres', 2.8),
    ('Chartreuse', 'Alkohol', 'Liquer', 'litres', 2.1),

    --     Soft Drinks
    ('Fanta', 'Nealkoholicke napoje', 'Soda', 'ks', 72),
    ('Sprite', 'Nealkoholicke napoje', 'Soda', 'ks', 72),
    ('Romerquelle Perliva', 'Nealkoholicke napoje', 'Sparkling Water', 'ks', 48),
    ('Romerquelle Neperliva', 'Nealkoholicke napoje', 'Still Water', 'ks', 48),
    ('Romerquelle Lemongrass', 'Nealkoholicke napoje', 'Lemongrass Water', 'ks', 48),
    ('Ginger Beer', 'Nealkoholicke napoje', 'Soft Drink', 'ks', 72),
    ('Coca-Cola', 'Nealkoholicke napoje', 'Soda', 'ks', 72),
    ('Coca-Cola Zero', 'Nealkoholicke napoje', 'Soda', 'ks', 72),

    --     Non-Alcoholic Beer
    ('Birell Nealko', 'Nealkoholicke napoje', 'Non-Alcoholic Beer', 'ks', 48),
    ('Birell Pomelo-Grep', 'Nealkoholicke napoje', 'Non-Alcoholic Beer', 'ks', 48),

    --     Tonic
    ('Kinley Tonic', 'Nealkoholicke napoje', 'Tonic', 'ks', 15),
    ('Kinley Tonic Ginger', 'Nealkoholicke napoje', 'Tonic', 'ks', 20),
    ('Kinley Tonic Pink', 'Nealkoholicke napoje', 'Tonic', 'ks', 20),

    --     Juices
    ('Cappy Jablko', 'Nealkoholicke napoje', 'Apple Juice', 'ks', 24),
    ('Cappy Pomaranc', 'Nealkoholicke napoje', 'Orange Juice', 'ks', 24),
    ('Cappy Multivitamin', 'Nealkoholicke napoje', 'Multivitamin Juice', 'ks', 24),

    --     Energy Drink
    ('Red Bull Classic', 'Nealkoholicke napoje', 'Energy Drink', 'ks', 48);




-- UPDATE sklad
-- SET sale_quantity = 4  -- Проданный объем
-- WHERE product_name = 'Cappy Pomaranc';
--
-- SELECT *
-- FROM sklad
-- ORDER BY id;



-- DROP TABLE users;
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL, -- пароли должны быть захешированы
    table_name VARCHAR(100) NOT NULL -- имя таблицы, которую этот пользователь может видеть
);
