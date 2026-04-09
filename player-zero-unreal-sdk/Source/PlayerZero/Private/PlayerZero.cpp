// Copyright Epic Games, Inc. All Rights Reserved.

#include "PlayerZero.h"

DEFINE_LOG_CATEGORY(LogPlayerZero);

#define LOCTEXT_NAMESPACE "FPlayerZeroModule"

void FPlayerZeroModule::StartupModule()
{
}

void FPlayerZeroModule::ShutdownModule()
{
	// This function may be called during shutdown to clean up your module.  For modules that support dynamic reloading,
	// we call this function before unloading the module.
}

#undef LOCTEXT_NAMESPACE
	
IMPLEMENT_MODULE(FPlayerZeroModule, PlayerZero)