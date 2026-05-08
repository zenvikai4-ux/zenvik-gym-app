# Zenvik AI — Gym Management App

Complete gym management mobile app for Android & iOS.

## Roles
- Super Admin — manages all gyms, billing, modules
- Gym Owner — members, trainers, leads, broadcasts
- Trainer — clients, diet plans
- Member — dashboard, diet, notifications, progress

## Setup
1. npm install
2. Run MIGRATIONS.sql in Supabase
3. eas build -p android --profile preview

## Build
eas login
eas build -p android --profile preview

## Test locally
npx expo start
