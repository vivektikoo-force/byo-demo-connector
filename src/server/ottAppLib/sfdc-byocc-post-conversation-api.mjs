import axios from 'axios';
import NodeCache from "node-cache" ;
import { settingsCache } from '../ottAppServer.mjs';
import { getTimeStampForLoglines } from '../util.mjs';

const {
    SF_SCRT_INSTANCE_URL
} = process.env;
const IS_LOCAL_CONFIG = process.env.IS_LOCAL_CONFIG === "true";
const responseCache = new NodeCache();

const conversationEndpoint = '/api/v1/conversation';
const appType = 'custom';
const role = 'EndUser';

export async function sendConversationAPIRequest(req, requestHeader) {

    let responseData = {};

    let jsonData = {
        "channelAddressIdentifier" : req.body.channelAddressIdentifier,
        "participants" : [
            {
                "subject" : req.body.endUserClientIdentifier,
                "role" : role,
                "appType" : appType
            }
        ]
    };

    let routingAttributes;
    if (req.body.routingAttributes) {
        try {
            const parsed = JSON.parse(req.body.routingAttributes);

            if (isValidMap(parsed)) {
                routingAttributes = parsed;
                jsonData["routingAttributes"] = routingAttributes;
            }
        } catch (e) {
            console.error("Invalid JSON in routingAttributes:", e);
        }
    }

    jsonData = JSON.stringify(jsonData);
    console.log(getTimeStampForLoglines() + "post conversation json data: ");
    console.dir(jsonData);

    responseData = await axios.post(
        (IS_LOCAL_CONFIG ? SF_SCRT_INSTANCE_URL : settingsCache.get("scrtUrl")) + conversationEndpoint,
        jsonData,
        requestHeader
    ).then(function (response) {
        console.log(getTimeStampForLoglines() + 'Conversation api post request completed successfully: ', response.data);
        responseCache.set("success", response.data.success);
        return response.data;
    }).catch(function (error) {
    let responseData = error.response.data;
        console.log(getTimeStampForLoglines() + 'Conversation api post request has error: ', responseData);
        responseCache.set("message", responseData.message);
        responseCache.set("code", responseData.code);
        return responseData;
    })
    return responseData;

    function isValidMap(parsed) {
        return typeof parsed === "object" &&
            parsed !== null &&
            !Array.isArray(parsed) &&
            Object.keys(parsed).length > 0
    }
}

