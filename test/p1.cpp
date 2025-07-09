#include <iostream>
#include <vector>
#include <cmath>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <map>
#include <set>
#include <unordered_set>

#define all(x) (x).begin, (x).end()
#define dbg(x) cout << "Line(" << __LINE__ << ") -> " << #x << " = " << (x) << endl;

using namespace std;

template <typename S, typename T>
void smax(S &a, const T &b)
{
    if (a < b)
        a = b;
};

template <typename S, typename T>
void smin(S &a, const T &b)
{
    if (a > b)
        a = b;
};

using ll = long long;
const int m = 1e9 + 7;

void solve()
{
    int n;
    cin >> n;

    vector<int> elem2IdxA(n + 1, -1);
    vector<int> elem2IdxB(n + 1, -1);
    vector<int> a(n, 0);
    vector<int> b(n, 0);

    for (int &st : a)
        cin >> st;
    for (int &st : b)
        cin >> st;

    for (int i = n - 1; i >= 0; i--)
    {
        int elemA = a[i];
        int elemB = b[i];
        if (elem2IdxA[elemA] != -1)
        {
            int dist = abs(i - elem2IdxA[elemA]);
            if (dist % 2 != 0)
            {
                cout << (i + 1) << endl;
                return;
            }
            else
            {
                if (dist != 1)
                {
                    cout << (i + 1) << endl;
                    return;
                }
            }
        }
        else if (elem2IdxB[elemA] != -1)
        {
            int dist = abs(i - elem2IdxB[elemA]);
            if (dist % 2 == 0)
            {
                cout << (i + 1) << endl;
                return;
            }
            else
            {
                if (dist != 1)
                {
                    cout << (i + 1) << endl;
                    return;
                }
            }
        }
        elem2IdxA[elemA] = i;
        if (elem2IdxB[elemB] != -1)
        {
            int dist = abs(i - elem2IdxB[elemB]);
            if (dist % 2 != 0)
            {
                cout << (i + 1) << endl;
                return;
            }
            else
            {
                if (dist != 1)
                {
                    cout << (i + 1) << endl;
                    return;
                }
            }
        }
        else if (elem2IdxA[elemB] != -1)
        {
            int dist = abs(i - elem2IdxA[elemB]);
            if (dist % 2 == 0)
            {
                cout << (i + 1) << endl;
                return;
            }
            else
            {
                if (dist != 1)
                {
                    cout << (i + 1) << endl;
                    return;
                }
            }
        }
        elem2IdxB[elemB] = i;
    }

    cout << 0 << endl;
    return;
}

int main()
{
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);
    cout.tie(nullptr);

    int TC = 1;
    cin >> TC;

    while (TC--)
        solve();

    return 0;
}