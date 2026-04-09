#pragma once

#include "CoreMinimal.h"
#include "GameEventTypes.h"
#include "PlayerZero.h"
#include "Api/Common/WebApi.h"
#include "Interfaces/IHttpResponse.h"

DECLARE_DELEGATE_TwoParams(FOnGameEventSent, bool /*bSuccess*/, const FString& /*Response*/);

template<typename T, typename = void>
struct HasToken : std::false_type {};

template<typename T>
struct HasToken<T, std::void_t<decltype(std::declval<T>().Token)>> : std::true_type {};

template<typename T>
constexpr bool HasToken_v = HasToken<T>::value;

class PLAYERZERO_API FGameEventApi : public FWebApi
{
	
public:
	template<typename TProps>
	void SendGameEventAsync(const TGameEventWrapper<TProps>& Wrapper, FOnGameEventSent OnComplete);
	
	FGameEventApi();
	
private:
	FString Url;
};

template<typename TProps>
void FGameEventApi::SendGameEventAsync(const TGameEventWrapper<TProps>& Wrapper, FOnGameEventSent OnComplete)
{
	TSharedPtr<FJsonObject> WrappedPayload = Wrapper.ToWrappedJson();

	FString JsonPayload;
	TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&JsonPayload);
	if (!FJsonSerializer::Serialize(WrappedPayload.ToSharedRef(), Writer))
	{
		OnComplete.ExecuteIfBound(false, TEXT("Failed to serialize wrapped JSON"));
		return;
	}
	
	TSharedPtr<FApiRequest> ApiRequest = MakeShared<FApiRequest>();
	ApiRequest->Url = Url;
	ApiRequest->Method = POST;
	ApiRequest->Headers.Add(TEXT("Content-Type"), TEXT("application/json"));
	ApiRequest->Payload = JsonPayload;

	TSharedPtr<FGameEventApi> SharedThis = StaticCastSharedRef<FGameEventApi>(AsShared());
	const FString& EventName = Wrapper.Event;
	ApiRequest->OnApiRequestComplete = FOnApiRequestComplete::CreateLambda(
		[SharedThis, EventName, OnComplete](TSharedPtr<FApiRequest> Request, FHttpResponsePtr Response, bool bSuccess)
		{
			if (!SharedThis.IsValid()) return;
			if (bSuccess && Response.IsValid() && EHttpResponseCodes::IsOk(Response->GetResponseCode()))
			{
				OnComplete.ExecuteIfBound(true, Response->GetContentAsString());
			}
			else
			{
				FString ErrorMsg = Response.IsValid() ? Response->GetContentAsString() : TEXT("Request failed");
				UE_LOG(LogPlayerZero, Warning, TEXT("%s event failed to send Payload: %s Error: %s"),*EventName , *Request->Payload, *ErrorMsg);
				OnComplete.ExecuteIfBound(false, ErrorMsg);
			}
		});
	DispatchRaw(ApiRequest);
}
