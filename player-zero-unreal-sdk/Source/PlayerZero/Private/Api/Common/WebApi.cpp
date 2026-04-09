#include "Api/Common/WebApi.h"
#include "HttpModule.h"
#include "PlayerZero.h"
#include "Interfaces/IHttpResponse.h"

FWebApi::FWebApi()
{
    Http = &FHttpModule::Get();
}

FWebApi::~FWebApi()
{
    
}

void FWebApi::DispatchRaw(TSharedPtr<FApiRequest> ApiRequest)
{
    TSharedPtr<IHttpRequest> Request = Http->CreateRequest();
    FString Url = ApiRequest->Url + BuildQueryString(ApiRequest->QueryParams);
    Request->SetURL(Url);
    Request->SetVerb(ApiRequest->GetVerb());
    Request->SetTimeout(10);
    FString Headers;
    for (const auto& Header : ApiRequest->Headers)
    {
        Request->SetHeader(Header.Key, Header.Value);
        Headers.Append(FString::Printf(TEXT("%s: %s\n"), *Header.Key, *Header.Value));
    }

    if (!ApiRequest->Payload.IsEmpty() && ApiRequest->Method != ERequestMethod::GET)
    {
        Request->SetContentAsString(ApiRequest->Payload);
    }

    TSharedPtr<FWebApi> Self = AsShared();
    Request->OnProcessRequestComplete().BindLambda(
        [Self, ApiRequest](FHttpRequestPtr Request, FHttpResponsePtr Response, bool bSuccess)
        {
            if (!Self.IsValid() || !ApiRequest.IsValid())
            {
                UE_LOG(LogPlayerZero, Warning, TEXT("FWebApi or ApiRequest was invalid when processing HTTP response to URL: %s"), *Request->GetURL());
                return;
            }
            
            Self->OnProcessResponse(Request, Response, bSuccess, ApiRequest);
        }
    );
    Request->ProcessRequest();
}

void FWebApi::OnProcessResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful, TSharedPtr<FApiRequest> ApiRequest)
{
    if (bWasSuccessful && Response.IsValid() && EHttpResponseCodes::IsOk(Response->GetResponseCode()))
    {
        ApiRequest->OnApiRequestComplete.ExecuteIfBound(ApiRequest, Response, true);
        return;
    }
    FString ErrorMessage = Response.IsValid() ? Response->GetContentAsString() : TEXT("Request failed");
    UE_LOG(LogPlayerZero, Warning, TEXT("WebApi from URL %s request failed: %s"), *Request->GetURL(), *ErrorMessage);
    ApiRequest->OnApiRequestComplete.ExecuteIfBound(ApiRequest, Response, false);
}

FString FWebApi::BuildQueryString(const TMap<FString, FString>& QueryParams)
{
    FString QueryString;
    if (QueryParams.Num() > 0)
    {
        QueryString.Append(TEXT("?"));
        for (const auto& Param : QueryParams)
        {
            QueryString.Append(FString::Printf(TEXT("%s=%s&"), *Param.Key, *Param.Value));
        }
        QueryString.RemoveFromEnd(TEXT("&"));
    }
    QueryString = QueryString.Replace( TEXT(" "), TEXT("%20") );
    return QueryString;
}
