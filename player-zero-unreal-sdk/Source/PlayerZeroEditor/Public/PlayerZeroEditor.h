// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

PLAYERZEROEDITOR_API DECLARE_LOG_CATEGORY_EXTERN(LogPlayerZeroEditor, Log, All);

class PLAYERZEROEDITOR_API FPlayerZeroEditorModule : public IModuleInterface
{
public:

	/** IModuleInterface implementation */
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
	
	/** This function will be bound to Command (by default it will bring up plugin window) */
	void PluginButtonClicked();
	
private:
	void RegisterMenus();
	void FillPlayerZeroMenu(UToolMenu* Menu);
	void OpenLoaderWindow();
	
	TSharedRef<SDockTab> OnSpawnPluginTab(const FSpawnTabArgs& SpawnTabArgs);
	TSharedPtr<FUICommandList> PluginCommands;
};
