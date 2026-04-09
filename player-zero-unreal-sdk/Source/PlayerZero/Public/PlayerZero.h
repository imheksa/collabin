// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

PLAYERZERO_API DECLARE_LOG_CATEGORY_EXTERN(LogPlayerZero, Log, All);

class PLAYERZERO_API FPlayerZeroModule : public IModuleInterface
{
public:

	/** IModuleInterface implementation */
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
};
