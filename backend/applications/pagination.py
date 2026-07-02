from rest_framework.pagination import PageNumberPagination


class ApplicationPagination(PageNumberPagination):
    """Paginate applications with a fixed default page size."""

    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50