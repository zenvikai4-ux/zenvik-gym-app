# GymApp — Deploy Guide

## Step 1: Install dependencies

Open a terminal in this folder (GymApp-final/artifacts/mobile) and run:

```
npm install
```

That's it — no pnpm, no workspace needed.

---

## Step 2: Run SQL Migrations in Supabase

1. Go to your Supabase project → SQL Editor → New Query  
2. Open `MIGRATIONS.sql` from this folder  
3. Paste it in and click **Run**

---

## Step 3: Build the APK

```
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

- Build takes ~10-15 minutes on Expo's servers  
- Download the `.apk` from the link it prints, or from **expo.dev → Builds**  
- Install on Android: open the link on your phone or use `adb install app.apk`

---

## Step 4: Test without building (Expo Go)

```
npx expo start
```

Scan the QR with the **Expo Go** app on your Android/iOS phone.

---

## Step 5: Create a Member login account

Members log in with email + password. To create one:

1. Supabase Dashboard → Authentication → Users → **Add User**  
2. Enter their email and password, copy the new user UUID  
3. In SQL Editor run:

```sql
INSERT INTO profiles (id, name, email, role, gym_id, member_id)
VALUES (
  '<paste-user-uuid>',
  '<member full name>',
  '<email>',
  'member',
  '<gym uuid from gyms table>',
  '<member uuid from members table>'
);
```

---

## Role Login Summary

| Role | What they see |
|------|--------------|
| Super Admin | All gyms, billing, modules, query log, activity |
| Gym Owner | Members + body/diet, leads, trainers, broadcast |
| Trainer | My clients (morning/evening), diet plans, broadcast |
| Member | My dashboard, my diets, notifications, send query |

---

## Troubleshooting

**"Cannot find module expo-router"** → run `npm install` again  
**Build fails on EAS** → make sure you ran `eas login` first  
**Supabase connection fails** → check `supabaseUrl` and `supabaseKey` in `app.json → extra`  
