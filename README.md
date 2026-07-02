# TenantPlus

TenantPlus is organized as a backend-first monorepo with clear separation between backend code, frontend code, and shared documentation.

## Layout

- [backend/](backend) - Django REST Framework API, apps, settings, migrations, and SQLite database for local development.
- [frontend/](frontend) - Reserved for the client application.
- [docs/](docs) - Shared project documentation and API collections.
- [manage.py](manage.py) - Root entry point for Django management commands.

## Development

Run Django commands from the repository root:

```powershell
python manage.py runserver
python manage.py check
python manage.py migrate
```
