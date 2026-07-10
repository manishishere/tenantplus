from rest_framework.pagination import PageNumberPagination


class DisputePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50