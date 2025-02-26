import axios from 'axios';
import NodeCache from "node-cache" ;
import { settingsCache } from '../ottAppServer.mjs';
import { getTimeStampForLoglines } from '../util.mjs';

const {
    SF_SCRT_INSTANCE_URL
} = process.env;
const IS_LOCAL_CONFIG = process.env.IS_LOCAL_CONFIG === "true";
const responseCache = new NodeCache();

const conversationHistoryEndpoint = '/api/v1/conversationHistory';
const appType = 'custom';

export async function sendConversationHistoryRequest(req, requestHeader) {

    let responseData = {};
    requestHeader.headers.AuthorizationContextType = "CONVERSATIONCHANNELDEFINITION";

    let jsonData = {
        "channelAddressIdentifier": req.body.channelAddressIdentifier,
        "conversationParticipants": req.body.participants.conversationParticipants,
        "conversationEntries": req.body.entries.conversationEntries
    }

    jsonData = JSON.stringify(jsonData);
    console.log(getTimeStampForLoglines() + "post conversation history json data: ");
    console.dir(jsonData);

    responseData = await axios.post(
        (IS_LOCAL_CONFIG ? SF_SCRT_INSTANCE_URL : settingsCache.get("scrtUrl")) + conversationHistoryEndpoint,
        jsonData,
        requestHeader
    ).then(function (response) {
        console.log(getTimeStampForLoglines() + 'Conversation History api post request completed successfully: ', response.data);
        responseCache.set("success", response.data.success);
        return response.data;
    }).catch(function (error) {
    let responseData = error.response.data;
        console.log(getTimeStampForLoglines() + 'Conversation History api post request has error: ', responseData);
        responseCache.set("message", responseData.message);
        responseCache.set("code", responseData.code);
        return responseData;
    })
    return responseData;
}

