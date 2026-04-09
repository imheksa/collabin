#pragma once
#include "Api/GameEvents/GameEventTypes.h"

struct PLAYERZERO_API FGameMatchEndedProperties : TJsonSerializable<FGameMatchEndedProperties>
{
	FString SessionId;
	FString GameId;
	int32 Score;
	int32 Outcome;
	TMap<FString, FString> CurrencyObtained;

	TSharedPtr<FJsonObject> ToJson() const
	{
		TSharedPtr<FJsonObject> Json = MakeShared<FJsonObject>();
		Json->SetStringField(TEXT("game_match_id"), SessionId);
		Json->SetStringField(TEXT("game_id"), GameId);
		Json->SetNumberField(TEXT("score"), Score);
		Json->SetNumberField(TEXT("outcome"), Outcome);

		TSharedPtr<FJsonObject> CurrencyJson = MakeShared<FJsonObject>();
		for (const auto& Pair : CurrencyObtained)
		{
			CurrencyJson->SetStringField(Pair.Key, Pair.Value);
		}
		Json->SetObjectField(TEXT("currency_obtained"), CurrencyJson);

		return Json;
	}
};