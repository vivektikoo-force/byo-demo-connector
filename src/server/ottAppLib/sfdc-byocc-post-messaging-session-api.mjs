import axios from "axios";
import NodeCache from "node-cache" ;
import { settingsCache } from "../ottAppServer.mjs";
import { getTimeStampForLoglines } from "../util.mjs";

const { SF_SCRT_INSTANCE_URL } = process.env;
const IS_LOCAL_CONFIG = process.env.IS_LOCAL_CONFIG === "true";
const responseCache = new NodeCache();

const postMessagingSessionEndpoint = "/api/v1/messagingSession";

export async function sendPostMessagingSessionAPIRequest(req, requestHeader) {
    let responseData = {};
    let jsonData = {
        "channelAddressIdentifier": req.body.channelAddressIdentifier,
        "conversationIdentifier": req.body.conversationIdentifier,
        "endUserClientId": req.body.endUserClientId,
        "operation": req.body.operation,
        "operationBy": req.body.operationBy
    };
    
    if (req.body.operation === "Inactivate") {
        jsonData["sessionId"] = req.body.sessionId;
    }

    console.log(getTimeStampForLoglines() + "Post Messaging Session json data: ");
    console.dir(jsonData);

    responseData = await axios.post(
        (IS_LOCAL_CONFIG ? SF_SCRT_INSTANCE_URL : settingsCache.get("scrtUrl")) + postMessagingSessionEndpoint,
        jsonData,
        requestHeader
    ).then(function (response) {
        console.log(getTimeStampForLoglines() + "Post Messaging Session api request completed successfully: ");
        console.dir(response.data);
        responseCache.set("success", response.data.success);
        return response.data;
    }).catch(function (error) {
        const errorResponseData = error.response.data;
        console.log(getTimeStampForLoglines() + "Post Messaging Session api request has error: ");
        console.dir(errorResponseData);
        responseCache.set("message", errorResponseData.message);
        responseCache.set("code", errorResponseData.code);
        return errorResponseData;
    });

    return responseData;
}