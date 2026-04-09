#pragma once

#include "Interfaces/IHttpResponse.h"
#include "JsonObjectConverter.h"
#include "WebImage.h"

/**
 * Attempts to parse a valid HTTP JSON response into a given struct type.
 * Returns true if the response was valid, had a 2xx code, and could be parsed.
 */
template <typename T>
bool TryParseJsonResponse(FHttpResponsePtr Response, T& OutStruct)
{
	return Response.IsValid()
		&& EHttpResponseCodes::IsOk(Response->GetResponseCode())
		&& FJsonObjectConverter::JsonObjectStringToUStruct(Response->GetContentAsString(), &OutStruct, 0, 0);
}
