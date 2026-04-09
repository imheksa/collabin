#pragma once

#include "CoreMinimal.h"
#include "JsonObjectConverter.h"
#include "Api/Common/Models/ApiResponse.h"
#include "PlayerZero.h"
#include "DeveloperLoginResponse.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZEROEDITOR_API FDeveloperLoginResponseBody : public FApiResponse
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero",  meta = (JsonName = "token"))
	FString Token;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "refreshToken"))
	FString RefreshToken;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "name"))
	FString Name;
	
};

USTRUCT(BlueprintType)
struct PLAYERZEROEDITOR_API FDeveloperLoginResponse : public FApiResponse
{
	GENERATED_BODY()
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "data"))
	FDeveloperLoginResponseBody Data;

	FString ToJsonString() const
	{
		FString OutputString;
		FJsonObjectConverter::UStructToJsonObjectString(*this, OutputString);
		return OutputString;
	}

	static bool FromJsonObject(const TSharedPtr<FJsonObject>& JsonObject, FDeveloperLoginResponse& OutObject)
	{
		if (JsonObject.IsValid())
		{
			return FJsonObjectConverter::JsonObjectToUStruct(JsonObject.ToSharedRef(), StaticStruct(), &OutObject, 0, 0);
		}
		UE_LOG(LogPlayerZero, Error, TEXT("JsonObject Invalid"));
		return false;
	}
};
