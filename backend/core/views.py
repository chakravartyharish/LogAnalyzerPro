import logging
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response

from django.conf import settings
import os

from .models import License
from .serializers import LicenseSerializer
from .serializers import (HWInterfaceSerializer, 
                          UserMessageSerializer, 
                          BackendEventSerializer, 
                          LicenseSerializer,
    UserSerializer, UserGroupSerializer)
from backend.decorators import EnforceAtLeastOneValidLicenseBaseView

from django.http import JsonResponse
from rest_framework.decorators import api_view
from core.log_processing import process_and_search_log_file  # Make sure you have this module

@api_view(['GET'])
def search_logs(request):
    print("search_logs view is being called")

    query_type = request.query_params.get('type')
    query_length = request.query_params.get('length')
    print(f"Query Type: {query_type}, Query Length: {query_length}")  

    if query_length is not None:
        query_length = int(query_length)

    gz_file_path = os.path.join(settings.BASE_DIR, 'logfiles', 'can.log_kMG5WR8.gz')
    print(f"Checking for file at: {gz_file_path}")  

    if not os.path.isfile(gz_file_path):
        print(f"File not found: {gz_file_path}") 
        return Response({'error': 'Log file does not exist.'}, status=404)

    query = f"type=='{query_type}' && length=={query_length}"
    print(f"Running query: {query}") 

    search_results = process_and_search_log_file(gz_file_path, query)
    print(f"Search Results: {search_results}") 
    
    return JsonResponse(search_results, safe=False)



class HWInterfaceView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post']
    serializer_class = HWInterfaceSerializer


class UserMessageView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put']
    serializer_class = UserMessageSerializer


class BackendEventView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put']
    serializer_class = BackendEventSerializer


class LicenseView(viewsets.ModelViewSet):
    http_method_names = ['get', 'put', 'post', 'delete']
    serializer_class = LicenseSerializer
    queryset = License.objects.all()
    


class UserView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post', 'delete']
    serializer_class = UserSerializer


class UserGroupView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post', 'delete']
    serializer_class = UserGroupSerializer
