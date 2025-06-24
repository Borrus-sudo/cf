#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Foundation.Collections.h>
#include <winrt/Windows.ApplicationModel.DataTransfer.h>
#include <windows.h>
#include <string>
#include <vector>
#include <algorithm>

using namespace winrt;
using namespace Windows::ApplicationModel::DataTransfer;

// Convert std::wstring to UTF-8 string
std::string to_utf8(const std::wstring& wstr) {
    if (wstr.empty()) return {};
    int size = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), -1, nullptr, 0, nullptr, nullptr);
    std::string result(size - 1, 0);
    WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), -1, result.data(), size, nullptr, nullptr);
    return result;
}

extern "C" {

    // Returns how many text items are in the clipboard history
    __declspec(dllexport)
        int get_clipboard_items_count() {
        init_apartment();

        auto result = Clipboard::GetHistoryItemsAsync().get();
        auto items = result.Items();
        auto iterator = items.First();

        int count = 0;
        while (iterator.HasCurrent()) {
            auto item = iterator.Current();
            auto content = item.Content();
            if (content.Contains(StandardDataFormats::Text())) {
                count++;
            }
            iterator.MoveNext();
        }

        return count;
    }

    // Returns heap-allocated array of heap-allocated strings
    __declspec(dllexport)
        char** get_clipboard_items() {
        init_apartment();

        std::vector<std::string> strings;

        auto result = Clipboard::GetHistoryItemsAsync().get();
        auto items = result.Items();
        auto iterator = items.First();

        while (iterator.HasCurrent()) {
            auto item = iterator.Current();
            auto content = item.Content();
            if (content.Contains(StandardDataFormats::Text())) {
                auto text = content.GetTextAsync().get();
                strings.push_back(to_utf8(text.c_str()));
            }
            iterator.MoveNext();
        }

        int count = static_cast<int>(strings.size());
        char** resultArray = new char* [count];

        for (int i = 0; i < count; ++i) {
            const std::string& str = strings[i];
            char* buffer = new char[str.size() + 1];
            std::copy(str.begin(), str.end(), buffer);
            buffer[str.size()] = '\0';
            resultArray[i] = buffer;
        }

        return resultArray;
    }

    // Frees memory returned by get_clipboard_items
    __declspec(dllexport)
        void free_clipboard_items(char** items, int count) {
        for (int i = 0; i < count; ++i) {
            delete[] items[i];
        }
        delete[] items;
    }

}
