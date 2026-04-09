#pragma once

#include "CoreMinimal.h"
#include "JsonObjectConverter.h"
#include "Interfaces/IHttpRequest.h"
#include "Misc/ScopeExit.h"
#include "Models/ApiRequest.h"

class FHttpModule;
struct FApiRequest;

class PLAYERZERO_API FWebApi : public TSharedFromThis<FWebApi>
{
public:
	
	FWebApi();
	virtual ~FWebApi();
	
	void DispatchRaw(TSharedPtr<FApiRequest> ApiRequest);
protected:	
	FHttpModule* Http;
	
	FString BuildQueryString(const TMap<FString, FString>& QueryParams);
	
	template <typename T>
	FString ConvertToJsonString(const T& Data);
	
	virtual void OnProcessResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful, TSharedPtr<FApiRequest> ApiRequest);
};

template <typename T>
FString FWebApi::ConvertToJsonString(const T& Data)
{
	FString JsonString;
	FJsonObjectConverter::UStructToJsonObjectString(Data, JsonString);
	return JsonString;
}