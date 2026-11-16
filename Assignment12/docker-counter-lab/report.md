# รายงานผลการทดลอง Docker Counter Lab

- **ชื่อ–นามสกุล:** นาย รชานนท์ แซ่ฮึง
- **รหัสนักศึกษา:** 67112845
- **วันที่ทดลอง:** 16 พฤศจิกายน 2026
- **สภาพแวดล้อม:** Windows 10 + Docker Desktop (Docker Engine 29.8.0, Compose v5.5.1), Windows PowerShell (`curl.exe`)

> รูปทั้งหมดอยู่ในโฟลเดอร์ `evidence/` เป็นภาพหน้าจอ PowerShell และ Chrome ที่แคปตอนรันคำสั่งจริง
> ทุกขั้นรันต่อเนื่องกันตั้งแต่เริ่มด้วยข้อมูลว่าง ตัวเลขในแต่ละรูปจึงต่อกัน

---

## ส่วนที่ 3: สร้าง Image

![docker build และ image inspect](evidence/01-build.png)

Build สำเร็จ และคำสั่งเริ่มต้นของ Image คือ `["python","-u","app.py"]`
Image คือแม่แบบที่ยังไม่ได้ทำงาน ส่วน Container คือ instance ที่ถูกสร้างและรันขึ้นมาจาก Image นั้น

---

## Checkpoint 1: รันสอง Service ด้วย Compose

![compose up, ps, curl, GET visits, gethostbyname](evidence/02-compose-up.png)

- `docker compose config --quiet` ได้ exit code 0 แปลว่าไฟล์ถูกต้อง
- `docker compose ps` แสดงว่า `redis` อยู่ในสถานะ healthy และ `web` เปิดพอร์ต `127.0.0.1:8080->8000/tcp`
- เรียก `/` ได้ `{"app": "Docker Lab", "visits": 1}` และเรียก `/health` ได้ `{"status": "ok"}`
- `GET visits` ใน Redis ได้ `1` ส่วน `socket.gethostbyname('redis')` ได้ `172.18.0.2`

**เส้นทางการเชื่อมต่อ `host:8080 → web:8000 → redis:6379`**

1. เบราว์เซอร์หรือ curl บนเครื่อง Host เรียก `127.0.0.1:8080`
2. Docker ส่งต่อพอร์ตนี้ไปยังพอร์ต `8000` ภายใน Container `web` ตามที่ตั้งไว้ใน `ports: "127.0.0.1:8080:8000"`
3. แอปใน `web` ติดต่อ Redis ด้วยชื่อ `redis` (`REDIS_HOST=redis`) ซึ่ง DNS ภายในเครือข่ายของ Compose แปลงเป็น IP `172.18.0.2` แล้วเชื่อมต่อที่พอร์ต `6379`
4. พอร์ต 6379 ของ Redis ไม่ได้เปิดออกสู่ Host (ในคอลัมน์ PORTS ขึ้นแค่ `6379/tcp` ไม่มีการ map) เพราะสอง Service คุยกันผ่านเครือข่ายภายในอยู่แล้ว

---

## Checkpoint 2: การคงอยู่ของข้อมูลและการเปลี่ยนค่าการตั้งค่า

### 5.1 ลบ Container แล้วสร้างใหม่

![GET visits → down → up → GET visits → curl](evidence/03-persist.png)

| ช่วงเวลา | ค่า visits |
|---|---|
| ก่อน `down` (N) | 5 |
| หลัง `up -d` ก่อนเปิดเว็บ | 5 |
| หลังเรียกหน้าเว็บอีก 1 ครั้ง (N+1) | 6 |

**วงจรชีวิตของ Volume:** `docker compose down` ลบ Container และ Network แต่ไม่ลบ Named Volume `counter-data` Redis บันทึกข้อมูลแบบ AOF ไว้ที่ `/data` ซึ่ง mount กับ Volume นี้ เมื่อสร้าง Container Redis ตัวใหม่และ mount Volume เดิมกลับเข้าไป Redis จะอ่านไฟล์ AOF แล้วกู้ข้อมูลคืนมา ข้อมูลจึงอยู่ได้นานกว่าตัว Container ข้อมูลจะหายก็ต่อเมื่อสั่ง `docker compose down -v` หรือลบ Volume โดยตรง

### 5.2 เปลี่ยน APP_LABEL จาก "Docker Lab" เป็น "CE Docker"

![restart web vs up -d web](evidence/04-env.png)

- หลัง `docker compose restart web` ยังได้ `"app": "Docker Lab"` (visits 7) เพราะเป็นการเริ่ม Container ตัวเดิมใหม่ ซึ่งยังใช้ environment ชุดเก่า
- หลัง `docker compose up -d web` Compose แสดง **Recreate** แล้วได้ `"app": "CE Docker"` (visits 8) คือสร้าง Container ใหม่ด้วยค่าใหม่ ส่วนตัวนับยังเดินต่อเพราะข้อมูลเก็บอยู่ใน Redis และ Volume ไม่ได้อยู่ใน Container `web`

---

## Assignment 1: Healthcheck ของ web โดยไม่เพิ่มยอด visits

![compose.yaml ที่เพิ่ม healthcheck และ ps แสดง web healthy](evidence/05-a1-healthy.png)

ส่วนที่เพิ่มใน `compose.yaml` (service `web`):

```yaml
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"]
      interval: 5s
      timeout: 3s
      retries: 3
      start_period: 5s
```

ใช้ Python ที่มีอยู่แล้วใน Image ยิงไปที่ `/health` ถ้าสถานะไม่ใช่ 2xx หรือเชื่อมต่อไม่ได้ `urlopen` จะ raise exception ทำให้ exit code ไม่เป็น 0 และถือว่า unhealthy

![visits ก่อนและหลังรอ และ log ของ healthcheck](evidence/06-a1-noinc.png)

- ค่า `visits` เป็น **8** ทั้งก่อนและหลังรอ (ตามเวลาในรูปคือ 22:28:32 และ 22:33:47) ซึ่งรอนานกว่า 10 วินาทีที่โจทย์กำหนด
  ในรอบนี้ `docker compose exec` ครั้งที่สองตอบช้าไปประมาณ 5 นาทีจาก Docker Desktop เอง ช่วงห่างจึงยาวกว่าคำสั่ง `Start-Sleep 12` แต่ผลก็ยังยืนยันได้ว่าค่าไม่เพิ่ม
- ใน log เห็น healthcheck เรียก `GET /health` ทุก 5 วินาที และ `docker inspect` ได้สถานะ `healthy`
- ค่าไม่เพิ่มเพราะ `/health` สั่งแค่ `PING` ไปที่ Redis ไม่ได้เรียก `INCR`

**ทำไมต้องใช้พอร์ต 8000 แทน 8080:** คำสั่ง healthcheck รัน**ภายใน Container `web`** โดยตรง และแอปใน Container เปิดรับที่ `0.0.0.0:8000` ส่วน `8080` เป็นพอร์ตฝั่งเครื่อง Host ที่ Docker map เข้ามาหา 8000 อีกที จากในตัว Container `127.0.0.1` หมายถึงตัว Container เอง ซึ่งไม่มีอะไรรับที่พอร์ต 8080

---

## Assignment 2: แยกตัวนับ 2 กลุ่มบน Redis ตัวเดียวกัน

![app.py ใช้ counter_key, compose มี web-b, build ใหม่, ps healthy ทั้ง 3](evidence/07-a2-up.png)

ส่วนที่แก้ใน `app.py`:

```python
counter_key = os.getenv("COUNTER_KEY", "visits")
...
                count = store.incr(counter_key)
```

ส่วนที่แก้ใน `compose.yaml`:

| | กลุ่ม A (`web`) | กลุ่ม B (`web-b`) |
|---|---|---|
| Image | `ce-counter:lab` | `ce-counter:lab` (ตัวเดียวกัน) |
| พอร์ต | `127.0.0.1:8080:8000` | `127.0.0.1:8081:8000` |
| `APP_LABEL` | `Group A` | `Group B` |
| `COUNTER_KEY` | `visits:a` | `visits:b` |
| healthcheck | ตาม Assignment 1 | เหมือนกลุ่ม A |

ทั้งสองกลุ่มใช้ Service `redis` ตัวเดียวกันและ Named Volume `counter-data` ตัวเดิม พอร์ตภายในเป็น 8000 ได้ทั้งคู่เพราะอยู่คนละ Container ไม่ได้ตั้ง `container_name` ไว้ จึงไม่มีชื่อซ้ำกัน

### ทดสอบว่าตัวนับแยกกัน

![เรียกกลุ่ม A 3 ครั้ง กลุ่ม B ไม่เปลี่ยน](evidence/08-a2-separate.png)

เรียกกลุ่ม B 1 ครั้ง ได้ `visits:b = 1` จากนั้นเรียกกลุ่ม A 3 ครั้ง ได้ `visits:a = 3` ส่วน **`visits:b` ยังเป็น 1 เท่าเดิม**

### ทดสอบว่าข้อมูลยังอยู่หลัง down / up

![MGET → down → up → GET ทั้งสองคีย์ → curl](evidence/09-a2-persist.png)

| คีย์ | ก่อน down | หลัง up (ก่อนเปิดเว็บ) | หลังเปิดเว็บ 1 ครั้ง |
|---|---|---|---|
| `visits:a` | 3 | 3 | 4 |
| `visits:b` | 1 | 1 | 2 |

### เปิดผ่านเว็บเบราว์เซอร์ (Chrome)

![กลุ่ม A ที่ 127.0.0.1:8080](evidence/10-browser-group-a.png)

![กลุ่ม B ที่ 127.0.0.1:8081](evidence/11-browser-group-b.png)

เปิดผ่าน Chrome ต่อจากรูปก่อนหน้า กลุ่ม A ได้ `visits: 5` ส่วนกลุ่ม B ได้ `visits: 3` แต่ละกลุ่มนับแยกกันต่อจากค่าเดิมของตัวเอง

**สรุป:** Image เดียวกันทำงานต่างกันได้ด้วยการเปลี่ยนแค่ environment variable (`COUNTER_KEY`, `APP_LABEL`) ทั้งสองกลุ่มเก็บข้อมูลใน Redis ตัวเดียวกันแต่คนละคีย์ ตัวนับจึงไม่กวนกัน และเมื่อลบแล้วสร้าง Container ใหม่ ข้อมูลทั้งสองคีย์ยังอยู่ครบเพราะเก็บไว้ใน Named Volume
