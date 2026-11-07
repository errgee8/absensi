# JP Karaoke & LuckyCat - Staff Shift Attendance & Anomaly Audit PWA

A lightweight, high-performance Progressive Web Application (PWA) built for staff shift check-in/out across **JP Karaoke** and **LuckyCat**, featuring division-specific shift rules, break monitoring, 10-minute grace period enforcement, and manager audit dashboard.

---

## 👥 1. JP Karaoke Staff Roster & PINs

All staff for JP Karaoke are pre-configured in the database:

### Server (Division: Server and Cashier)
- **Alex** — PIN: `1010` (Shift 1: 13:00 – 22:00)
- **Dio** — PIN: `2020` (Shift 1: 13:00 – 22:00)
- **Rojes** — PIN: `3030` (Shift 2: 18:30 – 03:00)
- **Dein** — PIN: `4040` (Shift 2: 18:30 – 03:00)
- **Made** — PIN: `5050` (Shift 1: 13:00 – 22:00)

### Cashier (Division: Server and Cashier)
- **Adis** — PIN: `1212` (Shift 1: 13:00 – 22:00)
- **Ica** — PIN: `3880` (Shift 2: 18:30 – 03:00)

### Cleaning Service (Division: Cleaning Service)
- **Yohan** — PIN: `2442` (Shift 1: 10:00 – 19:00)
- **Emil** — PIN: `1991` (Shift 2: 18:30 – 03:00)

### Storage (Division: Storage Staff)
- **Aris** — PIN: `9889` (Shift 1: 10:00 – 19:00)
- **Galang** — PIN: `2001` (Shift 2: 13:00 – 21:00)
- **Febry** — PIN: `2889` (Shift 3: 18:30 – 03:00)

> **LuckyCat Staff**: Cleared for manual addition by admin in the **"Staff Provisioning & PINs"** dashboard tab.

---

## ⏱️ 2. 10-Minute Grace Period Logic
Every shift includes an automated **10-minute grace period**:
- **Late Check-In**:
  - Checking in within 10 minutes of scheduled start time (e.g. up to 13:10 for a 13:00 shift) is considered on-time and clean.
  - Checking in **> 10 minutes** past scheduled start time triggers: `FLAG: Late Check-In (>10m Grace)`.
- **Early Check-Out**:
  - Checking out more than 10 minutes before scheduled end time triggers: `FLAG_EARLY_CHECKOUT`.
  - (Flexible checkout shifts like Shift 2 running until closing are exempt).

---

## 🏢 3. Shift Schedulers & Break Rules

### A. JP Karaoke (Strict No-Break Policy)
- **Server and Cashier**: Shift 1 (13:00 – 22:00), Shift 2 (18:30 – 03:00)
- **Cleaning Service**: Shift 1 (10:00 – 19:00), Shift 2 (18:30 – 03:00)
- **Storage Staff**: Shift 1 (10:00 – 19:00), Shift 2 (13:00 – 21:00), Shift 3 (18:30 – 03:00)
- **No break button/time for JP staff**.

### B. LuckyCat (1-Hour Break Policy)
- **Bar, Cashier, and Server**: Shift 1 (10:00 – 19:00, max break end 16:00), Shift 2 (18:30 – 03:30, max break end 01:00)
- **Kitchen**: Shift 1 & Shift 2 (editable via dashboard)
- Break is allowed **max 1 hour**, **once per shift**, requires selfie capture with watermark.

---

## 🔒 4. Admin Access & Security
- **Admin PIN**: Required to unlock the Manager Dashboard.
- **PIN is never written anywhere on the UI or in placeholder text**.
- The staff kiosk view does **not** display an obvious Manager button. Access is via a discreet lock icon in the header.

---

## 🚀 Running the App
- Production server active at: **`http://localhost:3001`**
- Start anytime with `npm run build && npm start`.
