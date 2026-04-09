// Copyright Epic Games, Inc. All Rights Reserved.

#include "PlayerZeroEditor.h"
#include "UI/Commands/LoginWindowCommands.h"
#include "UI/SPlayerZeroDeveloperLoginWidget.h"
#include "Widgets/Docking/SDockTab.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Text/STextBlock.h"
#include "ToolMenus.h"
#include "Settings/ProjectPackagingSettings.h"
#include "UI/LoginWindowStyle.h"
#include "UI/PlayerZeroDeveloperSettingsCustomization.h"

static const FName DeveloperWindowName("LoginWindow");
static const FName LoaderWindowName("LoaderWindow");
static const FName CacheWindowName("CacheGeneratorWindow");
#define LOCTEXT_NAMESPACE "PlayerZeroEditorModule"
DEFINE_LOG_CATEGORY(LogPlayerZeroEditor);

namespace
{
	void AddGLTFRuntimeToCookingDirectories()
	{
		UProjectPackagingSettings* PackagingSetting = GetMutableDefault<UProjectPackagingSettings>();
		if (!PackagingSetting->DirectoriesToAlwaysCook.ContainsByPredicate([](const auto& Item){ return Item.Path == "/ReadyPlayerMe/glTFRuntime";} ))
		{
			PackagingSetting->DirectoriesToAlwaysCook.Add(FDirectoryPath{"/glTFRuntime"});
#if ENGINE_MAJOR_VERSION > 4
			PackagingSetting->TryUpdateDefaultConfigFile();
#else
			PackagingSetting->UpdateDefaultConfigFile();
#endif
		}
	}
}

void FPlayerZeroEditorModule::StartupModule()
{
	AddGLTFRuntimeToCookingDirectories();
	FLoginWindowStyle::Initialize();
	FLoginWindowStyle::ReloadTextures();

	FLoginWindowCommands::Register();

	PluginCommands = MakeShareable(new FUICommandList);

	PluginCommands->MapAction(
		FLoginWindowCommands::Get().OpenPluginWindow,
		FExecuteAction::CreateRaw(this, &FPlayerZeroEditorModule::PluginButtonClicked),
		FCanExecuteAction());

	UToolMenus::RegisterStartupCallback(FSimpleMulticastDelegate::FDelegate::CreateRaw(this, &FPlayerZeroEditorModule::RegisterMenus));

	FGlobalTabmanager::Get()->RegisterNomadTabSpawner(DeveloperWindowName, FOnSpawnTab::CreateRaw(this, &FPlayerZeroEditorModule::OnSpawnPluginTab))
		.SetDisplayName(LOCTEXT("DeveloperLoginWidget", "Player Zero"))
		.SetMenuType(ETabSpawnerMenuType::Hidden);

	FPropertyEditorModule& PropertyEditor = FModuleManager::LoadModuleChecked<FPropertyEditorModule>("PropertyEditor");

	PropertyEditor.RegisterCustomClassLayout(
		"PlayerZeroDeveloperSettings",
		FOnGetDetailCustomizationInstance::CreateStatic(&FPlayerZeroDeveloperSettingsCustomization::MakeInstance)
	);
}

void FPlayerZeroEditorModule::RegisterMenus()
{
	FToolMenuOwnerScoped OwnerScoped(this);

	// Create a new main menu entry called "PlayerZero"
	UToolMenu* MainMenu = UToolMenus::Get()->ExtendMenu("LevelEditor.MainMenu");

	// Add a new top-level menu "Player Zero"
	FToolMenuSection& Section = MainMenu->AddSection("PlayerZeroTopMenu", LOCTEXT("PlayerZeroMenuSection", "Player Zero"));

	// Add a sub-menu for "Player Zero"
	FToolMenuEntry& SubMenuEntry = Section.AddSubMenu(
		"PlayerZero",
		LOCTEXT("PlayerZeroMenu", "Player Zero"),
		LOCTEXT("PlayerZeroMenu_ToolTip", "Open Player Zero tools"),
		FNewToolMenuDelegate::CreateRaw(this, &FPlayerZeroEditorModule::FillPlayerZeroMenu),
		false, // Don't open on hover
		FSlateIcon(FAppStyle::GetAppStyleSetName(), "Icons.User") // Optional icon for the top-level menu
	);
}

void FPlayerZeroEditorModule::FillPlayerZeroMenu(UToolMenu* Menu)
{
	FToolMenuSection& Section = Menu->AddSection("PlayerZeroSubSection");

	Section.AddMenuEntry(
		"OpenLoginWindow",
		LOCTEXT("OpenLoginWindow", "Developer Window"),
		LOCTEXT("OpenLoginWindowToolTip", "Open the Player Zero Developer Window."),
		FSlateIcon(),
		FUIAction(FExecuteAction::CreateRaw(this, &FPlayerZeroEditorModule::PluginButtonClicked))
	);
}

void FPlayerZeroEditorModule::ShutdownModule()
{
	UToolMenus::UnRegisterStartupCallback(this);
	UToolMenus::UnregisterOwner(this);

	FLoginWindowStyle::Shutdown();

	FLoginWindowCommands::Unregister();

	FGlobalTabmanager::Get()->UnregisterNomadTabSpawner(DeveloperWindowName);
	FGlobalTabmanager::Get()->UnregisterNomadTabSpawner(CacheWindowName);

	if (FModuleManager::Get().IsModuleLoaded("PropertyEditor"))
	{
		FPropertyEditorModule& PropertyEditor = FModuleManager::GetModuleChecked<FPropertyEditorModule>("PropertyEditor");
		PropertyEditor.UnregisterCustomClassLayout("PlayerZeroDeveloperSettings");
	}
}

TSharedRef<SDockTab> FPlayerZeroEditorModule::OnSpawnPluginTab(const FSpawnTabArgs& SpawnTabArgs)
{
	FText WidgetText = FText::Format(
		LOCTEXT("WindowWidgetText", "Add code to {0} in {1} to override this window's contents"),
		FText::FromString(TEXT("FPlayerZeroEditorModule::OnSpawnPluginTab")),
		FText::FromString(TEXT("PlayerZeroEditor.cpp"))
		);

	return SNew(SDockTab)
		.TabRole(NomadTab)
		[
			SNew(SPlayerZeroDeveloperLoginWidget)
		];
	
}

void FPlayerZeroEditorModule::PluginButtonClicked()
{
	FGlobalTabmanager::Get()->TryInvokeTab(DeveloperWindowName);
}


void FPlayerZeroEditorModule::OpenLoaderWindow()
{
	FGlobalTabmanager::Get()->TryInvokeTab(LoaderWindowName);
}

#undef LOCTEXT_NAMESPACE
	
IMPLEMENT_MODULE(FPlayerZeroEditorModule, PlayerZeroEditor)