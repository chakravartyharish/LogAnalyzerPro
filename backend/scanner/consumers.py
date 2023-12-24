from djangochannelsrestframework.observer import model_observer
from backend.base_consumers import DCRFBaseCRUDWithSubscriptionConsumerWithoutUserHandling
from scanner.models import ISOTPEndpointScanRun, ISOTPEndpointScanRunFinding, ISOTPEndpoint, UDSScanRun, \
    UDSScanRunFinding
from scanner.serializers import ISOTPEndpointScanRunSerializer, ISOTPEndpointScanRunFindingSerializer, \
    ISOTPEndpointSerializer, UDSScanRunSerializer, UDSScanRunFindingSerializer


class ISOTPEndpointScanRunFindingConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithoutUserHandling):

    model_class = ISOTPEndpointScanRunFinding
    serializer_class = ISOTPEndpointScanRunFindingSerializer

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)


class ISOTPEndpointScanRunConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithoutUserHandling):

    model_class = ISOTPEndpointScanRun
    serializer_class = ISOTPEndpointScanRunSerializer

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)


class ISOTPEndpointConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithoutUserHandling):

    model_class = ISOTPEndpoint
    serializer_class = ISOTPEndpointSerializer

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)


class UDSScanRunConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithoutUserHandling):

    model_class = UDSScanRun
    serializer_class = UDSScanRunSerializer

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)


class UDSScanRunFindingConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithoutUserHandling):

    model_class = UDSScanRunFinding
    serializer_class = UDSScanRunFindingSerializer

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)
