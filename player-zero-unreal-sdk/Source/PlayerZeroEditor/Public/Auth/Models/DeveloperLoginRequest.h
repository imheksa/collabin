#pragma once

#include "CoreMinimal.h"
#include "JsonObjectConverter.h"
#include "DeveloperLoginRequest.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZEROEDITOR_API FDeveloperLoginRequestBody
{
	GENERATED_BODY()
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FString LoginId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FString Password;

	FString ToJsonString() const
	{
		FString OutputString;
		FJsonObjectConverter::UStructToJsonObjectString(*this, OutputString);
		return OutputString;
	}

	static bool FromJsonString(const FString& JsonString, FDeveloperLoginRequestBody& OutStruct)
	{
		return FJsonObjectConverter::JsonObjectStringToUStruct(JsonString, &OutStruct, 0, 0);
	}
};

USTRUCT(BlueprintType)
struct PLAYERZEROEDITOR_API FDeveloperLoginRequest
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Request")
	FDeveloperLoginRequestBody Data;

	FString ToJsonString() const
	{
		FString OutputString;
		FJsonObjectConverter::UStructToJsonObjectString(*this, OutputString);
		return OutputString;
	}

	static bool FromJsonString(const FString& JsonString, FDeveloperLoginRequest& OutStruct)
	{
		return FJsonObjectConverter::JsonObjectStringToUStruct(JsonString, &OutStruct, 0, 0);
	}

	FDeveloperLoginRequest() = default;
	explicit FDeveloperLoginRequest(const FDeveloperLoginRequestBody& DeveloperLoginRequestBody);
	FDeveloperLoginRequest(const FString& Email, const FString& String)
	{
		Data.LoginId = Email;
		Data.Password = String;
	}
};
