/**
 * Sends a SF participant to Salesforce via the REST API.
 */
import axios from 'axios';
import NodeCache from "node-cache" ;
import { settingsCache } from '../ottAppServer.mjs';
import { getTimeStampForLoglines } from '../util.mjs';

const {
    SF_SCRT_INSTANCE_URL
} = process.env;
const IS_LOCAL_CONFIG = process.env.IS_LOCAL_CONFIG === "true";
const responseCache = new NodeCache();
const postParticipantEndpoint = '/api/v1/participant';

export async function sendPostParticipantAPIRequest(req, requestHeader) {

    let responseData = {};

    let jsonData = {
        "conversationIdentifier" : req.body.conversationIdentifier,
        "participants" : req.body.participants,
        "operation" : req.body.operation
    }

    console.log(getTimeStampForLoglines() + "post participant json data: ");
    console.dir(jsonData);

    responseData = await axios.post(
        (IS_LOCAL_CONFIG ? SF_SCRT_INSTANCE_URL : settingsCache.get("scrtUrl")) + postParticipantEndpoint,
        jsonData,
        requestHeader
    ).then(function (response) {
        console.log(getTimeStampForLoglines() + "post participant api request completed successfully: ", response.data);
        responseCache.set("success", response.data.success);
        return response.data;
    }).catch(function (error) {
        let errorResponseData = error.response.data;
        console.dir(errorResponseData);
        console.log(getTimeStampForLoglines() + "post participant api request has error: ", errorResponseData);
        responseCache.set("message", errorResponseData.message);
        responseCache.set("code", errorResponseData.code);
        return errorResponseData;
    });
    return responseData;
}