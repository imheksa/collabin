#include "Api/Files/FileApi.h"
#include "HttpModule.h"
#include "PlayerZero.h"
#include "Api/Files/Models/FileData.h"
#include "Interfaces/IHttpResponse.h"

FFileApi::FFileApi()
{
}

FFileApi::~FFileApi()
{
}

void FFileApi::LoadFileFromUrl(const FString& URL, FOnAssetFileRequestComplete OnComplete)
{
	const FFileData& File = FFileData(URL);
	TSharedRef<IHttpRequest, ESPMode::ThreadSafe> HttpRequest = FHttpModule::Get().CreateRequest();
	TSharedPtr<FFileApi> Self = AsShared();
	HttpRequest->OnProcessRequestComplete().BindLambda( 
		[Self, File, OnComplete](FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful)
		{
			if (!Self.IsValid())
			{
				return;
			}
			if (bWasSuccessful && Response.IsValid() && Response->GetContentLength() > 0)
			{
				TArray<uint8> Content = Response->GetContent();
				OnComplete.ExecuteIfBound(File, Content);
				return;
			}
			UE_LOG(LogPlayerZero, Warning, TEXT("Failed to load file from URL. Try loading from cache"));
			OnComplete.ExecuteIfBound(File, TArray<uint8>());;
		});
	HttpRequest->SetURL(URL);
	HttpRequest->SetVerb("GET");
	HttpRequest->ProcessRequest();
}
