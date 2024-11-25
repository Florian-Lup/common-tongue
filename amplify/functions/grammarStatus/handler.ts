import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDB } from "aws-sdk";

const dynamoDB = new DynamoDB.DocumentClient();

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
  "Access-Control-Allow-Methods": "OPTIONS,GET",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Credentials": "true",
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const requestId = event.queryStringParameters?.requestId;

  if (!requestId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Missing requestId parameter" }),
    };
  }

  try {
    const result = await dynamoDB
      .get({
        TableName: process.env.RESULTS_TABLE!,
        Key: { requestId },
      })
      .promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Result not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};