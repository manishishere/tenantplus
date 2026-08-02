"""
URL configuration for tenantplus project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

from accounts.views import ProfileView, admin_dashboard, user_directory

urlpatterns = [
    path('admin/', admin.site.urls),
    path('admin/dashboard', admin_dashboard),
    path('api/users', user_directory),
    path('api/profile', ProfileView.as_view()),
    path('api/accounts/', include('accounts.urls')),
    path('api/properties/', include('properties.urls')),
    path('api/applications/', include('applications.urls')),
    path('api/agreements/', include('agreements.urls')),
    path('api/notices/', include('notices.urls')),
    path('api/disputes/', include('disputes.urls')),
    path('api/rent-payments/', include('rent_payments.urls')),
    path('api/maintenance/', include('maintenance.urls')),
    path('api/inspections/', include('inspections.urls')),
    path('api/utilities/', include('utilities.urls')),
    path('api/chat/', include('chat.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
