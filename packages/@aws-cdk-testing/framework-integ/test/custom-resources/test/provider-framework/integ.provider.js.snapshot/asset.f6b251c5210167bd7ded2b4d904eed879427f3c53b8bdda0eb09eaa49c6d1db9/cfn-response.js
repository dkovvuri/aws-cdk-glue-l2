"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Retry = exports.safeHandler = exports.includeStackTraces = exports.submitResponse = exports.MISSING_PHYSICAL_ID_MARKER = exports.CREATE_FAILED_PHYSICAL_ID_MARKER = void 0;
/* eslint-disable max-len */
/* eslint-disable no-console */
const url = require("url");
const outbound_1 = require("./outbound");
const util_1 = require("./util");
exports.CREATE_FAILED_PHYSICAL_ID_MARKER = 'AWSCDK::CustomResourceProviderFramework::CREATE_FAILED';
exports.MISSING_PHYSICAL_ID_MARKER = 'AWSCDK::CustomResourceProviderFramework::MISSING_PHYSICAL_ID';
async function submitResponse(status, event, options = {}) {
    const json = {
        Status: status,
        Reason: options.reason || status,
        StackId: event.StackId,
        RequestId: event.RequestId,
        PhysicalResourceId: event.PhysicalResourceId || exports.MISSING_PHYSICAL_ID_MARKER,
        LogicalResourceId: event.LogicalResourceId,
        NoEcho: options.noEcho,
        Data: event.Data,
    };
    (0, util_1.log)('submit response to cloudformation', json);
    const responseBody = JSON.stringify(json);
    const parsedUrl = url.parse(event.ResponseURL);
    const retryOptions = {
        attempts: 5,
        sleep: 1000,
    };
    await (0, util_1.withRetries)(retryOptions, outbound_1.httpRequest)({
        hostname: parsedUrl.hostname,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'content-type': '',
            'content-length': Buffer.byteLength(responseBody, 'utf8'),
        },
    }, responseBody);
}
exports.submitResponse = submitResponse;
exports.includeStackTraces = true; // for unit tests
function safeHandler(block) {
    return async (event) => {
        // ignore DELETE event when the physical resource ID is the marker that
        // indicates that this DELETE is a subsequent DELETE to a failed CREATE
        // operation.
        if (event.RequestType === 'Delete' && event.PhysicalResourceId === exports.CREATE_FAILED_PHYSICAL_ID_MARKER) {
            (0, util_1.log)('ignoring DELETE event caused by a failed CREATE event');
            await submitResponse('SUCCESS', event);
            return;
        }
        try {
            await block(event);
        }
        catch (e) {
            // tell waiter state machine to retry
            if (e instanceof Retry) {
                (0, util_1.log)('retry requested by handler');
                throw e;
            }
            if (!event.PhysicalResourceId) {
                // special case: if CREATE fails, which usually implies, we usually don't
                // have a physical resource id. in this case, the subsequent DELETE
                // operation does not have any meaning, and will likely fail as well. to
                // address this, we use a marker so the provider framework can simply
                // ignore the subsequent DELETE.
                if (event.RequestType === 'Create') {
                    (0, util_1.log)('CREATE failed, responding with a marker physical resource id so that the subsequent DELETE will be ignored');
                    event.PhysicalResourceId = exports.CREATE_FAILED_PHYSICAL_ID_MARKER;
                }
                else {
                    // otherwise, if PhysicalResourceId is not specified, something is
                    // terribly wrong because all other events should have an ID.
                    (0, util_1.log)(`ERROR: Malformed event. "PhysicalResourceId" is required: ${JSON.stringify({ ...event, ResponseURL: '...' })}`);
                }
            }
            // this is an actual error, fail the activity altogether and exist.
            await submitResponse('FAILED', event, {
                reason: exports.includeStackTraces ? e.stack : e.message,
            });
        }
    };
}
exports.safeHandler = safeHandler;
class Retry extends Error {
}
exports.Retry = Retry;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2ZuLXJlc3BvbnNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2ZuLXJlc3BvbnNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1QiwrQkFBK0I7QUFDL0IsMkJBQTJCO0FBQzNCLHlDQUF5QztBQUN6QyxpQ0FBMEM7QUFFN0IsUUFBQSxnQ0FBZ0MsR0FBRyx3REFBd0QsQ0FBQztBQUM1RixRQUFBLDBCQUEwQixHQUFHLDhEQUE4RCxDQUFDO0FBZ0JsRyxLQUFLLFVBQVUsY0FBYyxDQUFDLE1BQTRCLEVBQUUsS0FBaUMsRUFBRSxVQUF5QyxFQUFHO0lBQ2hKLE1BQU0sSUFBSSxHQUFtRDtRQUMzRCxNQUFNLEVBQUUsTUFBTTtRQUNkLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxJQUFJLE1BQU07UUFDaEMsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO1FBQ3RCLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztRQUMxQixrQkFBa0IsRUFBRSxLQUFLLENBQUMsa0JBQWtCLElBQUksa0NBQTBCO1FBQzFFLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxpQkFBaUI7UUFDMUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1FBQ3RCLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtLQUNqQixDQUFDO0lBRUYsSUFBQSxVQUFHLEVBQUMsbUNBQW1DLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFL0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUUxQyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUUvQyxNQUFNLFlBQVksR0FBRztRQUNuQixRQUFRLEVBQUUsQ0FBQztRQUNYLEtBQUssRUFBRSxJQUFJO0tBQ1osQ0FBQztJQUNGLE1BQU0sSUFBQSxrQkFBVyxFQUFDLFlBQVksRUFBRSxzQkFBVyxDQUFDLENBQUM7UUFDM0MsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRO1FBQzVCLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSTtRQUNwQixNQUFNLEVBQUUsS0FBSztRQUNiLE9BQU8sRUFBRTtZQUNQLGNBQWMsRUFBRSxFQUFFO1lBQ2xCLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQztTQUMxRDtLQUNGLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDbkIsQ0FBQztBQS9CRCx3Q0ErQkM7QUFFVSxRQUFBLGtCQUFrQixHQUFHLElBQUksQ0FBQyxDQUFDLGlCQUFpQjtBQUV2RCxTQUFnQixXQUFXLENBQUMsS0FBb0M7SUFDOUQsT0FBTyxLQUFLLEVBQUUsS0FBVSxFQUFFLEVBQUU7UUFFMUIsdUVBQXVFO1FBQ3ZFLHVFQUF1RTtRQUN2RSxhQUFhO1FBQ2IsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsa0JBQWtCLEtBQUssd0NBQWdDLEVBQUUsQ0FBQztZQUNwRyxJQUFBLFVBQUcsRUFBQyx1REFBdUQsQ0FBQyxDQUFDO1lBQzdELE1BQU0sY0FBYyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2QyxPQUFPO1FBQ1QsQ0FBQztRQUVELElBQUksQ0FBQztZQUNILE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JCLENBQUM7UUFBQyxPQUFPLENBQU0sRUFBRSxDQUFDO1lBQ2hCLHFDQUFxQztZQUNyQyxJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUUsQ0FBQztnQkFDdkIsSUFBQSxVQUFHLEVBQUMsNEJBQTRCLENBQUMsQ0FBQztnQkFDbEMsTUFBTSxDQUFDLENBQUM7WUFDVixDQUFDO1lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM5Qix5RUFBeUU7Z0JBQ3pFLG1FQUFtRTtnQkFDbkUsd0VBQXdFO2dCQUN4RSxxRUFBcUU7Z0JBQ3JFLGdDQUFnQztnQkFDaEMsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUNuQyxJQUFBLFVBQUcsRUFBQyw0R0FBNEcsQ0FBQyxDQUFDO29CQUNsSCxLQUFLLENBQUMsa0JBQWtCLEdBQUcsd0NBQWdDLENBQUM7Z0JBQzlELENBQUM7cUJBQU0sQ0FBQztvQkFDTixrRUFBa0U7b0JBQ2xFLDZEQUE2RDtvQkFDN0QsSUFBQSxVQUFHLEVBQUMsNkRBQTZELElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEtBQUssRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3ZILENBQUM7WUFDSCxDQUFDO1lBRUQsbUVBQW1FO1lBQ25FLE1BQU0sY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUU7Z0JBQ3BDLE1BQU0sRUFBRSwwQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU87YUFDakQsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUMsQ0FBQztBQUNKLENBQUM7QUEzQ0Qsa0NBMkNDO0FBRUQsTUFBYSxLQUFNLFNBQVEsS0FBSztDQUFJO0FBQXBDLHNCQUFvQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCAqIGFzIHVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHsgaHR0cFJlcXVlc3QgfSBmcm9tICcuL291dGJvdW5kJztcbmltcG9ydCB7IGxvZywgd2l0aFJldHJpZXMgfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgY29uc3QgQ1JFQVRFX0ZBSUxFRF9QSFlTSUNBTF9JRF9NQVJLRVIgPSAnQVdTQ0RLOjpDdXN0b21SZXNvdXJjZVByb3ZpZGVyRnJhbWV3b3JrOjpDUkVBVEVfRkFJTEVEJztcbmV4cG9ydCBjb25zdCBNSVNTSU5HX1BIWVNJQ0FMX0lEX01BUktFUiA9ICdBV1NDREs6OkN1c3RvbVJlc291cmNlUHJvdmlkZXJGcmFtZXdvcms6Ok1JU1NJTkdfUEhZU0lDQUxfSUQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIENsb3VkRm9ybWF0aW9uUmVzcG9uc2VPcHRpb25zIHtcbiAgcmVhZG9ubHkgcmVhc29uPzogc3RyaW5nO1xuICByZWFkb25seSBub0VjaG8/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsb3VkRm9ybWF0aW9uRXZlbnRDb250ZXh0IHtcbiAgU3RhY2tJZDogc3RyaW5nO1xuICBSZXF1ZXN0SWQ6IHN0cmluZztcbiAgUGh5c2ljYWxSZXNvdXJjZUlkPzogc3RyaW5nO1xuICBMb2dpY2FsUmVzb3VyY2VJZDogc3RyaW5nO1xuICBSZXNwb25zZVVSTDogc3RyaW5nO1xuICBEYXRhPzogYW55O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3VibWl0UmVzcG9uc2Uoc3RhdHVzOiAnU1VDQ0VTUycgfCAnRkFJTEVEJywgZXZlbnQ6IENsb3VkRm9ybWF0aW9uRXZlbnRDb250ZXh0LCBvcHRpb25zOiBDbG91ZEZvcm1hdGlvblJlc3BvbnNlT3B0aW9ucyA9IHsgfSkge1xuICBjb25zdCBqc29uOiBBV1NMYW1iZGEuQ2xvdWRGb3JtYXRpb25DdXN0b21SZXNvdXJjZVJlc3BvbnNlID0ge1xuICAgIFN0YXR1czogc3RhdHVzLFxuICAgIFJlYXNvbjogb3B0aW9ucy5yZWFzb24gfHwgc3RhdHVzLFxuICAgIFN0YWNrSWQ6IGV2ZW50LlN0YWNrSWQsXG4gICAgUmVxdWVzdElkOiBldmVudC5SZXF1ZXN0SWQsXG4gICAgUGh5c2ljYWxSZXNvdXJjZUlkOiBldmVudC5QaHlzaWNhbFJlc291cmNlSWQgfHwgTUlTU0lOR19QSFlTSUNBTF9JRF9NQVJLRVIsXG4gICAgTG9naWNhbFJlc291cmNlSWQ6IGV2ZW50LkxvZ2ljYWxSZXNvdXJjZUlkLFxuICAgIE5vRWNobzogb3B0aW9ucy5ub0VjaG8sXG4gICAgRGF0YTogZXZlbnQuRGF0YSxcbiAgfTtcblxuICBsb2coJ3N1Ym1pdCByZXNwb25zZSB0byBjbG91ZGZvcm1hdGlvbicsIGpzb24pO1xuXG4gIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04uc3RyaW5naWZ5KGpzb24pO1xuXG4gIGNvbnN0IHBhcnNlZFVybCA9IHVybC5wYXJzZShldmVudC5SZXNwb25zZVVSTCk7XG5cbiAgY29uc3QgcmV0cnlPcHRpb25zID0ge1xuICAgIGF0dGVtcHRzOiA1LFxuICAgIHNsZWVwOiAxMDAwLFxuICB9O1xuICBhd2FpdCB3aXRoUmV0cmllcyhyZXRyeU9wdGlvbnMsIGh0dHBSZXF1ZXN0KSh7XG4gICAgaG9zdG5hbWU6IHBhcnNlZFVybC5ob3N0bmFtZSxcbiAgICBwYXRoOiBwYXJzZWRVcmwucGF0aCxcbiAgICBtZXRob2Q6ICdQVVQnLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdjb250ZW50LXR5cGUnOiAnJyxcbiAgICAgICdjb250ZW50LWxlbmd0aCc6IEJ1ZmZlci5ieXRlTGVuZ3RoKHJlc3BvbnNlQm9keSwgJ3V0ZjgnKSxcbiAgICB9LFxuICB9LCByZXNwb25zZUJvZHkpO1xufVxuXG5leHBvcnQgbGV0IGluY2x1ZGVTdGFja1RyYWNlcyA9IHRydWU7IC8vIGZvciB1bml0IHRlc3RzXG5cbmV4cG9ydCBmdW5jdGlvbiBzYWZlSGFuZGxlcihibG9jazogKGV2ZW50OiBhbnkpID0+IFByb21pc2U8dm9pZD4pIHtcbiAgcmV0dXJuIGFzeW5jIChldmVudDogYW55KSA9PiB7XG5cbiAgICAvLyBpZ25vcmUgREVMRVRFIGV2ZW50IHdoZW4gdGhlIHBoeXNpY2FsIHJlc291cmNlIElEIGlzIHRoZSBtYXJrZXIgdGhhdFxuICAgIC8vIGluZGljYXRlcyB0aGF0IHRoaXMgREVMRVRFIGlzIGEgc3Vic2VxdWVudCBERUxFVEUgdG8gYSBmYWlsZWQgQ1JFQVRFXG4gICAgLy8gb3BlcmF0aW9uLlxuICAgIGlmIChldmVudC5SZXF1ZXN0VHlwZSA9PT0gJ0RlbGV0ZScgJiYgZXZlbnQuUGh5c2ljYWxSZXNvdXJjZUlkID09PSBDUkVBVEVfRkFJTEVEX1BIWVNJQ0FMX0lEX01BUktFUikge1xuICAgICAgbG9nKCdpZ25vcmluZyBERUxFVEUgZXZlbnQgY2F1c2VkIGJ5IGEgZmFpbGVkIENSRUFURSBldmVudCcpO1xuICAgICAgYXdhaXQgc3VibWl0UmVzcG9uc2UoJ1NVQ0NFU1MnLCBldmVudCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGJsb2NrKGV2ZW50KTtcbiAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgIC8vIHRlbGwgd2FpdGVyIHN0YXRlIG1hY2hpbmUgdG8gcmV0cnlcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgUmV0cnkpIHtcbiAgICAgICAgbG9nKCdyZXRyeSByZXF1ZXN0ZWQgYnkgaGFuZGxlcicpO1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWV2ZW50LlBoeXNpY2FsUmVzb3VyY2VJZCkge1xuICAgICAgICAvLyBzcGVjaWFsIGNhc2U6IGlmIENSRUFURSBmYWlscywgd2hpY2ggdXN1YWxseSBpbXBsaWVzLCB3ZSB1c3VhbGx5IGRvbid0XG4gICAgICAgIC8vIGhhdmUgYSBwaHlzaWNhbCByZXNvdXJjZSBpZC4gaW4gdGhpcyBjYXNlLCB0aGUgc3Vic2VxdWVudCBERUxFVEVcbiAgICAgICAgLy8gb3BlcmF0aW9uIGRvZXMgbm90IGhhdmUgYW55IG1lYW5pbmcsIGFuZCB3aWxsIGxpa2VseSBmYWlsIGFzIHdlbGwuIHRvXG4gICAgICAgIC8vIGFkZHJlc3MgdGhpcywgd2UgdXNlIGEgbWFya2VyIHNvIHRoZSBwcm92aWRlciBmcmFtZXdvcmsgY2FuIHNpbXBseVxuICAgICAgICAvLyBpZ25vcmUgdGhlIHN1YnNlcXVlbnQgREVMRVRFLlxuICAgICAgICBpZiAoZXZlbnQuUmVxdWVzdFR5cGUgPT09ICdDcmVhdGUnKSB7XG4gICAgICAgICAgbG9nKCdDUkVBVEUgZmFpbGVkLCByZXNwb25kaW5nIHdpdGggYSBtYXJrZXIgcGh5c2ljYWwgcmVzb3VyY2UgaWQgc28gdGhhdCB0aGUgc3Vic2VxdWVudCBERUxFVEUgd2lsbCBiZSBpZ25vcmVkJyk7XG4gICAgICAgICAgZXZlbnQuUGh5c2ljYWxSZXNvdXJjZUlkID0gQ1JFQVRFX0ZBSUxFRF9QSFlTSUNBTF9JRF9NQVJLRVI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBQaHlzaWNhbFJlc291cmNlSWQgaXMgbm90IHNwZWNpZmllZCwgc29tZXRoaW5nIGlzXG4gICAgICAgICAgLy8gdGVycmlibHkgd3JvbmcgYmVjYXVzZSBhbGwgb3RoZXIgZXZlbnRzIHNob3VsZCBoYXZlIGFuIElELlxuICAgICAgICAgIGxvZyhgRVJST1I6IE1hbGZvcm1lZCBldmVudC4gXCJQaHlzaWNhbFJlc291cmNlSWRcIiBpcyByZXF1aXJlZDogJHtKU09OLnN0cmluZ2lmeSh7IC4uLmV2ZW50LCBSZXNwb25zZVVSTDogJy4uLicgfSl9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gdGhpcyBpcyBhbiBhY3R1YWwgZXJyb3IsIGZhaWwgdGhlIGFjdGl2aXR5IGFsdG9nZXRoZXIgYW5kIGV4aXN0LlxuICAgICAgYXdhaXQgc3VibWl0UmVzcG9uc2UoJ0ZBSUxFRCcsIGV2ZW50LCB7XG4gICAgICAgIHJlYXNvbjogaW5jbHVkZVN0YWNrVHJhY2VzID8gZS5zdGFjayA6IGUubWVzc2FnZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIFJldHJ5IGV4dGVuZHMgRXJyb3IgeyB9XG4iXX0=