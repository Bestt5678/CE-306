--1. สร้างตาราง Employee
CREATE TABLE Employee (
    employee_id VARCHAR(10) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    address TEXT,
    phone_number VARCHAR(10),
    salary DECIMAL(10, 2)
);
--2. สร้างตาราง Product
CREATE TABLE Product (
    product_id VARCHAR(10) PRIMARY KEY,
    product_name VARCHAR(200),
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(10, 2)
);
--3. สร้างตาราง orders
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);
--4. สร้างตารางที่มี Composite Primary Key - order_items
CREATE TABLE order_items (
    order_id INT,
    product_id VARCHAR(10),
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES Product(product_id)
);

------------------------------------------------------------------------
--ส่วนที่2
------------------------------------------------------------------------
--5. Insert ข้อมูล
INSERT INTO Employee (employee_id, first_name, last_name, address, phone_number, salary)
VALUES ('EMP001', 'สมชาย', 'ใจดี', 'กรุงเทพมหานคร', '0812345678', 25000.00);
--6. Update ข้อมูล
UPDATE Employee
SET salary = salary * 1.10
WHERE employee_id = 'EMP001';
--7. Delete ข้อมูล
DELETE FROM Product
WHERE price <= 0 OR product_name IS NULL OR product_name = '';
------------------------------------------------------------------------
--ส่วนที่ 3
------------------------------------------------------------------------
--8. กรองเงื่อนไขและเรียงลำดับ
SELECT product_id, product_name, price
FROM Product
WHERE category = 'Electronics' AND price > 500
ORDER BY price DESC;
--9. การจัดกลุ่มและคำนวณสถิติ
SELECT AVG(salary) AS avg_salary, COUNT(*) AS total_employees
FROM Employee;
--10. การค้นหาข้อความด้วย Pattern
SELECT *
FROM Employee
WHERE last_name LIKE 'ทอง%';
------------------------------------------------------------------------
--การเชื่อมโยงตารางและการวิเคราะห์
------------------------------------------------------------------------
--11. Inner Join ระหว่าง 2 ตาราง
SELECT o.order_id, c.customer_id
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id;
--12. Multi-table Join และการสรุปยอด
SELECT o.order_id, p.product_name, p.price
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
JOIN Product p ON oi.product_id = p.product_id;
--13. Group By & Having
SELECT customer_id, COUNT(order_id) AS total_orders
FROM orders
GROUP BY customer_id
HAVING COUNT(order_id) > 3;