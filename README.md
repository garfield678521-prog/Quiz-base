# QuizShare

A responsive quiz website using GitHub Pages + Supabase.

## Features
- Play public quizzes without signing in
- Sign up/sign in to create and save quizzes
- Public quiz library
- Import/export `.qz`
- Share quizzes through the public library
- Optional test mode
- Optional pass percentage
- Printable/downloadable certificate after passing

## Setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase.sql`.
3. In Supabase Authentication, enable Email/Password.
4. Put your Supabase project URL and publishable/anon key into `config.js`.
5. Upload these files to a GitHub repository.
6. Enable GitHub Pages.

Do not put a Supabase service-role key in the website.

## Notes
The included certificate uses the browser print dialog so the user can choose "Save as PDF". For production, a server/Edge Function can generate a true PDF and a signed certificate-verification page.

The `.qz` format is JSON wrapped in a `.qz` filename and is validated before import.
