from . import views
# import views
from django.urls import path, re_path

urlpatterns = [
	path('', views.index),
    path('transfer', views.transfer),
    path('check_img', views.check_img),
]