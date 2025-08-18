import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';
import {v4 as uuidv4} from "uuid";
import {getAccessToken} from './sfdc-auth.mjs';
import path from 'path';
import {fileURLToPath} from 'url';
import {convEntryIdsCache, settingsCache} from '../ottAppServer.mjs';
import {getTimeStampForLoglines} from '../util.mjs';

// Get config metadata from .env
const {
  SF_SCRT_INSTANCE_URL, // OTT-needed
  USER_ID
} = process.env;
const IS_LOCAL_CONFIG = process.env.IS_LOCAL_CONFIG === "true";

/**
 * Sends a SF inbound message to Salesforce via the REST API.
 *
 * @returns {Promise<AxiosResponse<any>>} result object from interaction service with successful status or error code
 * @param orgId
 * @param authorizationContext
 * @param req
 * @param conversationIdentifier
 * @param authorizationContextType
 * @param senderIdentifier
 */
export async function sendSFConversationEntry(orgId,
                                              authorizationContext, authorizationContextType,
                                              conversationIdentifier, senderIdentifier, req) {
  let message = req.body.message;
  let timestamp = req.body.timestamp;
  let messageType = req.body.messageType;
  const senderRole = authorizationContextType === "ExternalConversationParticipant" ? "Chatbot" : "EndUser";

  console.log(getTimeStampForLoglines()
    + `Start sendSFConversationEntry().\nmessage="${message}"\ntimestamp=${timestamp}\nmessageType=${messageType}`);

  // Send 'TypingStoppedIndicator' request before send the message in order to remove typing indicator if any
  //sendSFTypingIndicatorConversationEntry(orgId,
  //  authorizationContext, authorizationContextType, conversationIdentifier,
  //  senderRole, senderIdentifier, 'TypingStoppedIndicator');

  const accessToken = await getAccessToken();
  let jsonData = {};
  let formData = new FormData();
  let interactionType;
  const entryId = uuidv4();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const __rootdir = __dirname + '/../../../';

  if(messageType === "StaticContentMessage") {
    jsonData = getSFTextMessageFormData(entryId, conversationIdentifier,
      senderRole, senderIdentifier, message, timestamp);
  } else if(messageType === "ChoiceMessage") {
    jsonData = getSFChoiceMessageFormData(entryId, conversationIdentifier,
      senderRole, senderIdentifier, message, timestamp);
  } else if(messageType === "FormMessage") {
    jsonData = getSFFormMessageFormData(entryId, conversationIdentifier,
      senderRole, senderIdentifier, message, timestamp);
  }

  formData.append('json', JSON.stringify(jsonData),
    {contentType: 'application/json'});

  const requestHeader = getInboundMessageRequestHeader(accessToken, orgId,
    authorizationContext, authorizationContextType);

  // Node Cache does not support array, so have to put dummy empty string as placeholder
  convEntryIdsCache.set(entryId, '');
  console.log(getTimeStampForLoglines() + 'headers: ', JSON.stringify(requestHeader));
  console.log(getTimeStampForLoglines() + 'jsonData: ', JSON.stringify(jsonData));

  const responseData = await axios.post(
    (IS_LOCAL_CONFIG ? SF_SCRT_INSTANCE_URL : settingsCache.get("scrtUrl"))
    + '/api/v1/conversationEntry',
    JSON.stringify(jsonData),
    requestHeader
  ).then(function (response) {
    console.log(getTimeStampForLoglines()
      + `sendSFConversationEntry() success for interactionType "${interactionType}": `,
      response.data);

    return response.data;
  })
    .catch(function (error) {
      let responseData = error.response.data;
      console.log(getTimeStampForLoglines()
        + `sendSFInboundMessageInteraction() error for interactionType "${interactionType}": `,
        responseData);

      getSFMessageDeliveryFailedFormData(entryId, conversationIdentifier,
        senderIdentifier, senderRole, responseData.code);

      return error;
    });

  return responseData;
}

/**
 * Fetch conversation entries from Salesforce via the REST API.
 *
 * @returns {Promise<AxiosResponse<any>>} result object from interaction service with successful status or error code
 * @param orgId
 * @param authorizationContext
 * @param req
 * @param conversationIdentifier
 * @param authorizationContextType
 * @param senderIdentifier
 */
export async function fetchSFConversationEntries(orgId,
                                                 authorizationContext, authorizationContextType, req) {

  console.log(getTimeStampForLoglines()
    + `Start fetchSFConversationEntries().\nmessage="${message}"\nattachment=${attachment}\ntimestamp=${timestamp}\nmessageType=${messageType}`);

  const accessToken = await getAccessToken();
  let jsonData = {
    "conversationIdentifier": req.body.conversationIdentifier,
    "limit": req.body.limit,
    "startTime": req.body.startTime,
    "endTime": req.body.endTime
  };

  const requestHeader = getInboundMessageRequestHeader(accessToken, orgId,
    authorizationContext, authorizationContextType);

  console.log(getTimeStampForLoglines() + 'jsonData: ', JSON.stringify(jsonData));

  const responseData = await axios.get(
    (IS_LOCAL_CONFIG ? SF_SCRT_INSTANCE_URL : settingsCache.get("scrtUrl"))
    + '/api/v1/conversationEntry',
    JSON.stringify(jsonData),
    requestHeader
  ).then(function (response) {
    console.log(getTimeStampForLoglines()
      + `fetchConversationEntries() success`, response.data);

    return response.data;
  })
    .catch(function (error) {
      console.log(getTimeStampForLoglines() + 'error: ', error);    
      return error;
    });

  return responseData;
}

/**
 * Sends an SF TypingStartedIndicator to Salesforce via the BYOC REST API.
 *
 * @returns {Promise<AxiosResponse<any>>} result object from interaction service with successful status or error code
 * @param orgId
 * @param authorizationContext
 * @param entryType
 * @param authorizationContextType
 * @param conversationIdentifier
 * @param senderRole
 * @param senderSubject
 */
export async function sendSFTypingIndicatorConversationEntry(orgId,
                                                             authorizationContext, authorizationContextType, conversationIdentifier,
                                                             senderRole, senderSubject, entryType) {
  console.log(getTimeStampForLoglines()
    + `Start sendSFTypingIndicatorConversationEntry() with entryType: ${entryType}.`);

  const accessToken = await getAccessToken();
  let jsonData = getSFTypingIndicatorFormData(conversationIdentifier,
    senderRole, senderSubject, entryType);

  const requestHeader = getInboundMessageRequestHeader(accessToken, orgId,
    authorizationContext, authorizationContextType);

  const responseData = await axios.post(
    (IS_LOCAL_CONFIG ? SF_SCRT_INSTANCE_URL : settingsCache.get("scrtUrl"))
    + '/api/v1/conversationEntry',
    JSON.stringify(jsonData),
    requestHeader
  ).then(function (response) {
    if (response && response.data) {
      console.log(getTimeStampForLoglines()
        + 'sendSFTypingIndicatorConversationEntry() success: ',
        response.data);
    }

    return response;
  })
    .catch(function (error) {
      if (error && error.response && error.response.data) {
        let responseData = error.response.data;
        console.log(getTimeStampForLoglines()
          + 'sendSFTypingIndicatorConversationEntry() error: ', responseData);
      }

      return error;
    });

  return responseData;
}

/**
 * Sends a SF inbound MessageDeliveryFailed to Salesforce via the BYOC REST API.
 *
 * @param {string} entryId: The entryId for the failed message delivery
 * @param {string} orgId: The organization id for the login user
 * @param {string} authorizationContext: The AuthorizationContext which is ConversationChannelDefinition developer name for request authorization
 * @param {string} channelAddressIdentifier: The channel address identifier used for the inbound/outbound messaging
 * @param {string} endUserClientIdentifier: The end user client identifier used for the inbound/outbound messaging
 * @returns {object} result object from interaction service with successful status or error code
 */
async function sendSFInboundMessageDeliveryFailedInteraction(entryId,
                                                             interactionType, orgId, authorizationContext, channelAddressIdentifier,
                                                             endUserClientIdentifier, errorCode) {
  console.log(getTimeStampForLoglines()
    + `Start sendSFInboundMessageDeliveryFailedInteraction() for interactionType: "${interactionType}" and entryId: "${entryId}".`);
  const accessToken = await getAccessToken();
  let jsonData = getSFInboundMessageDeliveryFailedFormData(entryId,
    channelAddressIdentifier, endUserClientIdentifier, errorCode);

  const requestHeader = getInboundMessageRequestHeader(accessToken, orgId,
    authorizationContext);

  const formData = new FormData();
  formData.append('json', JSON.stringify(jsonData),
    {contentType: 'application/json'});

  const responseData = await axios.post(
    (IS_LOCAL_CONFIG ? SF_SCRT_INSTANCE_URL : settingsCache.get("scrtUrl"))
    + '/api/v1/interactions',
    formData,
    requestHeader
  ).then(function (response) {
    console.log(getTimeStampForLoglines()
      + 'sendSFInboundMessageDeliveryFailedInteraction() success: ',
      response.data);
    return response.data;
  })
    .catch(function (error) {
      if (error && error.response && error.response.data) {
        console.log(getTimeStampForLoglines()
          + 'sendSFInboundMessageDeliveryFailedInteraction() error: ',
          error.response.data);
      }

      return error;
    });

  return responseData;
}

function getSFTextMessageFormData(entryId, conversationIdentifier,
                                  senderRole, senderSubject, messagePayload, timestamp) {
  return {
    "conversationIdentifier": conversationIdentifier,
    "sender": {
      "subject": senderSubject,
      "role": senderRole,
      "appType": "custom"
    },
    "conversationEntries": [
      {
        "clientTimestamp": timestamp,
        "entryPayload": {
          "entryType": "Message",
          "id": entryId,
          "abstractMessage": {
            "messageType": "StaticContentMessage",
            "id": entryId,
            "staticContent": {
              "formatType": "Text",
              "text": messagePayload
            }
          }
        }
      }
    ]
  };
}

function getSFChoiceMessageFormData(entryId, conversationIdentifier,
                                    senderRole, senderSubject, messagePayload, timestamp) {
  // Parse the stringified JSON message payload
  const choices = JSON.parse(messagePayload);
  return {
    "conversationIdentifier": conversationIdentifier,
    "sender": {
      "subject": senderSubject,
      "role": senderRole,
      "appType": "custom"
    },
    "conversationEntries": [
      {
        "clientTimestamp": timestamp,
        "entryPayload": {
          "id": entryId,
          "entryType": "Message",
          "abstractMessage": {
            "id": entryId,
            "messageType": "ChoicesMessage",
            "choices": choices
          }
        }
      }
    ]
  };
}

function getSFFormMessageFormData(entryId, conversationIdentifier,
                                    senderRole, senderSubject, messagePayload, timestamp) {
  // Parse the stringified JSON message payload
  const formData = JSON.parse(messagePayload);

  return {
    "conversationIdentifier": conversationIdentifier,
    "sender": {
      "subject": senderSubject,
      "role": senderRole,
      "appType": "custom"
    },
    "conversationEntries": [
      {
        "clientTimestamp": timestamp,
        "entryPayload": {
          "id": entryId,
          "entryType": "Message",
          "abstractMessage": {
            "id": entryId,
            "messageType": "FormMessage",
            "form": formData
          }
        }
      }
    ]
  };
}

function getSFTypingIndicatorFormData(conversationIdentifier,
                                      senderRole, senderSubject, entryType) {
  const uuid = uuidv4();
  return {
    "conversationIdentifier": conversationIdentifier,
    "sender": {
      "subject": senderSubject,
      "role": senderRole,
      "appType": "custom"
    },
    "conversationEntries": [
      {
        "clientTimestamp": 1688190840000,
        "entryPayload": {
          "id": uuid,
          "entryType": entryType,
          "timestamp": 1688190840000
        }
      }
    ]
  };
}

function getSFMessageDeliveryFailedFormData(entryId,
                                            conversationIdentifier, senderSubject, senderRole, errorCode) {
  const uuid = uuidv4();
  return {
    "conversationIdentifier": conversationIdentifier,
    "sender": {
      "subject": senderSubject,
      "role": senderRole,
      "appType": "custom"
    },
    "conversationEntries": [
      {
        "clientTimestamp": 1688190840000,
        "entryPayload": {
          "id": uuid,
          "failedConversationEntryIdentifier": entryId,
          "entryType": "MessageDeliveryFailed",
          "recipient": {
            "appType": "custom",
            "subject": senderSubject,
            "role": senderRole
          },
          "errorCode": "" + errorCode
        }
      }
    ]
  };
}

function getInboundMessageRequestHeader(accessToken, orgId,
                                        authorizationContext, authorizationContextType) {
  const uuid = uuidv4();
  return {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "OrgId": orgId,
      "AuthorizationContext": authorizationContext,
      "AuthorizationContextType": authorizationContextType,
      "RequestId": uuid
    }
  };
}
