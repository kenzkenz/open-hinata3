// 地理院グリフを使う時は以下のフォントを使う。
// "text-font": ["NotoSansJP-Regular"],


// 'text-font': ['NotoSansJP-Regular'],

// const testSource = {
//     id: 'test-source', obj: {
//         type: 'geojson',
//         data: "https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://mapdata.qchizu.xyz/vector/mlit_road2019/bridge2/{z}/{x}/{y}.geojson",
//     }
// }
// const testLayer = {
//     id: 'test-layer',
//     type: 'circle', // シンボルの種類（ポイントデータならcircleやsymbol、ラインならline、エリアならfillなど）
//     source: 'test-source',
//     paint: {
//         'circle-radius': 5,
//         'circle-color': '#007cbf'
//     }
// }
import std from '@/assets/json/modified_std.json'
import mono from '@/assets/json/modified_mono.json'
import fxDark from '@/assets/json/modified_fx-dark.json'
const stdSources = []
const stdLayers = std.layers
Object.keys(std.sources).forEach(function(key) {
    stdSources.push({
        id: key,
        obj: std.sources[key]
    })
})
// ---------------------------------------------------------------------
export const monoSources = []
export const monoLayers = mono.layers
Object.keys(mono.sources).forEach(function(key) {
    monoSources.push({
        id: key,
        obj: mono.sources[key]
    })
})
// ---------------------------------------------------------------------
const fxDarkSources = []
const fxDarkLayers = fxDark.layers
Object.keys(fxDark.sources).forEach(function(key) {
    fxDarkSources.push({
        id: key,
        obj: fxDark.sources[key]
    })
})


export let konUrls = [
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1896-1909年', timeFolder: '2man'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1917-1924年', timeFolder: '00'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1927-1939年', timeFolder: '01'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1944-1954年', timeFolder: '02'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1965-1968年', timeFolder: '03'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1975-1978年', timeFolder: '04'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1983-1987年', timeFolder: '05'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1992-1995年', timeFolder: '06'},
    {name: '首都圏', datasetFolder: 'tokyo50', time: '1998-2005年', timeFolder: '07'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1888-1898年', timeFolder: '2man'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1920年', timeFolder: '00'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1932年', timeFolder: '01'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1937-1938年', timeFolder: '02'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1947年', timeFolder: '03'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1959-1960年', timeFolder: '04'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1968-1973年', timeFolder: '05'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1976-1980年', timeFolder: '06'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1984-1989年', timeFolder: '07'},
    {name: '中京圏', datasetFolder: 'chukyo', time: '1992-1996年', timeFolder: '08'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1892-1910年', timeFolder: '2man'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1922-1923年', timeFolder: '00'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1927-1935年', timeFolder: '01'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1947-1950年', timeFolder: '02'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1954-1956年', timeFolder: '03'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1961-1964年', timeFolder: '03x'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1967-1970年', timeFolder: '04'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1975-1979年', timeFolder: '05'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1983-1988年', timeFolder: '06'},
    {name: '京阪神圏', datasetFolder: 'keihansin', time: '1993-1997年', timeFolder: '07'},
    {name: '札幌', datasetFolder: 'sapporo', time: '1916年', timeFolder: '00'},
    {name: '札幌', datasetFolder: 'sapporo', time: '1935年', timeFolder: '01'},
    {name: '札幌', datasetFolder: 'sapporo', time: '1950-1952年', timeFolder: '02'},
    {name: '札幌', datasetFolder: 'sapporo', time: '1975-1976年', timeFolder: '03'},
    {name: '札幌', datasetFolder: 'sapporo', time: '1995-1998年', timeFolder: '04'},
    {name: '仙台', datasetFolder: 'sendai', time: '1928-1933年', timeFolder: '00'},
    {name: '仙台', datasetFolder: 'sendai', time: '1946年', timeFolder: '01'},
    {name: '仙台', datasetFolder: 'sendai', time: '1963-1967年', timeFolder: '02'},
    {name: '仙台', datasetFolder: 'sendai', time: '1977-1978年', timeFolder: '03'},
    {name: '仙台', datasetFolder: 'sendai', time: '1995-2000年', timeFolder: '04'},
    {name: '広島', datasetFolder: 'hiroshima', time: '1894-1899年', timeFolder: '2man'},
    {name: '広島', datasetFolder: 'hiroshima', time: '1925-1932年', timeFolder: '00'},
    {name: '広島', datasetFolder: 'hiroshima', time: '1950-1954年', timeFolder: '01'},
    {name: '広島', datasetFolder: 'hiroshima', time: '1967-1969年', timeFolder: '02'},
    {name: '広島', datasetFolder: 'hiroshima', time: '1984-1990年', timeFolder: '03'},
    {name: '広島', datasetFolder: 'hiroshima', time: '1992-2001年', timeFolder: '04'},
    {name: '福岡・北九州', datasetFolder: 'fukuoka', time: '1922-1926年', timeFolder: '00'},
    {name: '福岡・北九州', datasetFolder: 'fukuoka', time: '1936-1938年', timeFolder: '01'},
    {name: '福岡・北九州', datasetFolder: 'fukuoka', time: '1948-1956年', timeFolder: '02'},
    {name: '福岡・北九州', datasetFolder: 'fukuoka', time: '1967-1972年', timeFolder: '03'},
    {name: '福岡・北九州', datasetFolder: 'fukuoka', time: '1982-1986年', timeFolder: '04'},
    {name: '福岡・北九州', datasetFolder: 'fukuoka', time: '1991-2000年', timeFolder: '05'},
    {name: '東北地方太平洋岸', datasetFolder: 'tohoku_pacific_coast', time: '1901-1913年', timeFolder: '00'},
    {name: '東北地方太平洋岸', datasetFolder: 'tohoku_pacific_coast', time: '1949-1953年', timeFolder: '01'},
    {name: '東北地方太平洋岸', datasetFolder: 'tohoku_pacific_coast', time: '1969-1982年', timeFolder: '02'},
    {name: '東北地方太平洋岸', datasetFolder: 'tohoku_pacific_coast', time: '1990-2008年', timeFolder: '03'},
    {name: '関東', datasetFolder: 'kanto', time: '1894-1915年', timeFolder: '00'},
    {name: '関東', datasetFolder: 'kanto', time: '1928-1945年', timeFolder: '01'},
    {name: '関東', datasetFolder: 'kanto', time: '1972-1982年', timeFolder: '02'},
    {name: '関東', datasetFolder: 'kanto', time: '1988-2008年', timeFolder: '03'},
    {name: '沖縄本島南部', datasetFolder: 'okinawas', time: '1919年', timeFolder: '00'},
    {name: '沖縄本島南部', datasetFolder: 'okinawas', time: '1973-1975年', timeFolder: '01'},
    {name: '沖縄本島南部', datasetFolder: 'okinawas', time: '1992-1994年', timeFolder: '02'},
    {name: '沖縄本島南部', datasetFolder: 'okinawas', time: '2005-2008年', timeFolder: '03'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1889-1890年', timeFolder: '2man'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1916-1918年', timeFolder: '00'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1938-1950年', timeFolder: '01'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1956-1959年', timeFolder: '02'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1975-1988年', timeFolder: '03'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1988-1995年', timeFolder: '04'},
    {name: '浜松・豊橋', datasetFolder: 'hamamatsu', time: '1996-2010年', timeFolder: '05'},
    {name: '熊本', datasetFolder: 'kumamoto', time: '1900-1901年', timeFolder: '2man'},
    {name: '熊本', datasetFolder: 'kumamoto', time: '1926年', timeFolder: '00'},
    {name: '熊本', datasetFolder: 'kumamoto', time: '1965-1971年', timeFolder: '01'},
    {name: '熊本', datasetFolder: 'kumamoto', time: '1983年', timeFolder: '02'},
    {name: '熊本', datasetFolder: 'kumamoto', time: '1998-2000年', timeFolder: '03'},
    {name: '新潟', datasetFolder: 'niigata', time: '1910-1911年', timeFolder: '00'},
    {name: '新潟', datasetFolder: 'niigata', time: '1930-1931年', timeFolder: '01'},
    {name: '新潟', datasetFolder: 'niigata', time: '1966-1968年', timeFolder: '02'},
    {name: '新潟', datasetFolder: 'niigata', time: '1980-1988年', timeFolder: '03'},
    {name: '新潟', datasetFolder: 'niigata', time: '1997-2001年', timeFolder: '04'},
    {name: '姫路', datasetFolder: 'himeji', time: '1903-1910年', timeFolder: '2man'},
    {name: '姫路', datasetFolder: 'himeji', time: '1923年', timeFolder: '00'},
    {name: '姫路', datasetFolder: 'himeji', time: '1967年', timeFolder: '01'},
    {name: '姫路', datasetFolder: 'himeji', time: '1981-1985年', timeFolder: '02'},
    {name: '姫路', datasetFolder: 'himeji', time: '1997-2001年', timeFolder: '03'},
    {name: '岡山・福山', datasetFolder: 'okayama', time: '1895-1898年', timeFolder: '2man'},
    {name: '岡山・福山', datasetFolder: 'okayama', time: '1925年', timeFolder: '00'},
    {name: '岡山・福山', datasetFolder: 'okayama', time: '1965-1970年', timeFolder: '01'},
    {name: '岡山・福山', datasetFolder: 'okayama', time: '1978-1988年', timeFolder: '02'},
    {name: '岡山・福山', datasetFolder: 'okayama', time: '1990-2000年', timeFolder: '03'},
    {name: '鹿児島', datasetFolder: 'kagoshima', time: '1902年', timeFolder: '5man'},
    {name: '鹿児島', datasetFolder: 'kagoshima', time: '1902年', timeFolder: '2man'},
    {name: '鹿児島', datasetFolder: 'kagoshima', time: '1932年', timeFolder: '00'},
    {name: '鹿児島', datasetFolder: 'kagoshima', time: '1966年', timeFolder: '01'},
    {name: '鹿児島', datasetFolder: 'kagoshima', time: '1982-1983年', timeFolder: '02'},
    {name: '鹿児島', datasetFolder: 'kagoshima', time: '1996-2001年', timeFolder: '03'},
    {name: '松山', datasetFolder: 'matsuyama', time: '1903年', timeFolder: '2man'},
    {name: '松山', datasetFolder: 'matsuyama', time: '1928-1955年', timeFolder: '00'},
    {name: '松山', datasetFolder: 'matsuyama', time: '1968年', timeFolder: '01'},
    {name: '松山', datasetFolder: 'matsuyama', time: '1985年', timeFolder: '02'},
    {name: '松山', datasetFolder: 'matsuyama', time: '1998-1999年', timeFolder: '03'},
    {name: '大分', datasetFolder: 'oita', time: '1914年', timeFolder: '00'},
    {name: '大分', datasetFolder: 'oita', time: '1973年', timeFolder: '01'},
    {name: '大分', datasetFolder: 'oita', time: '1984-1986年', timeFolder: '02'},
    {name: '大分', datasetFolder: 'oita', time: '1997-2001年', timeFolder: '03'},
    {name: '長崎', datasetFolder: 'nagasaki', time: '1900-1901年', timeFolder: '2man'},
    {name: '長崎', datasetFolder: 'nagasaki', time: '1924-1926年', timeFolder: '00'},
    {name: '長崎', datasetFolder: 'nagasaki', time: '1954年', timeFolder: '01'},
    {name: '長崎', datasetFolder: 'nagasaki', time: '1970年', timeFolder: '02'},
    {name: '長崎', datasetFolder: 'nagasaki', time: '1982-1983年', timeFolder: '03'},
    {name: '長崎', datasetFolder: 'nagasaki', time: '1996-2000年', timeFolder: '03'},
    {name: '金沢・富山', datasetFolder: 'kanazawa', time: '1909-1910年', timeFolder: '2man'},
    {name: '金沢・富山', datasetFolder: 'kanazawa', time: '1930年', timeFolder: '00'},
    {name: '金沢・富山', datasetFolder: 'kanazawa', time: '1968-1969年', timeFolder: '01'},
    {name: '金沢・富山', datasetFolder: 'kanazawa', time: '1981-1985年', timeFolder: '02'},
    {name: '金沢・富山', datasetFolder: 'kanazawa', time: '1994-2001年', timeFolder: '03'},
    {name: '和歌山', datasetFolder: 'wakayama', time: '1908-1912年', timeFolder: '2man'},
    {name: '和歌山', datasetFolder: 'wakayama', time: '1934年', timeFolder: '00'},
    {name: '和歌山', datasetFolder: 'wakayama', time: '1947年', timeFolder: '01'},
    {name: '和歌山', datasetFolder: 'wakayama', time: '1966-1967年', timeFolder: '02'},
    {name: '和歌山', datasetFolder: 'wakayama', time: '1984-1985年', timeFolder: '03'},
    {name: '和歌山', datasetFolder: 'wakayama', time: '1998-2000年', timeFolder: '04'},
    {name: '青森', datasetFolder: 'aomori', time: '1912年', timeFolder: '00'},
    {name: '青森', datasetFolder: 'aomori', time: '1939-1955年', timeFolder: '01'},
    {name: '青森', datasetFolder: 'aomori', time: '1970年', timeFolder: '02'},
    {name: '青森', datasetFolder: 'aomori', time: '1984-1989年', timeFolder: '03'},
    {name: '青森', datasetFolder: 'aomori', time: '2003-2011年', timeFolder: '04'},
    {name: '高松', datasetFolder: 'takamatsu', time: '1896-1910年', timeFolder: '2man'},
    {name: '高松', datasetFolder: 'takamatsu', time: '1928年', timeFolder: '00'},
    {name: '高松', datasetFolder: 'takamatsu', time: '1969年', timeFolder: '01'},
    {name: '高松', datasetFolder: 'takamatsu', time: '1983-1984年', timeFolder: '02'},
    {name: '高松', datasetFolder: 'takamatsu', time: '1990-2000年', timeFolder: '03'},
    {name: '長野', datasetFolder: 'nagano', time: '1912年', timeFolder: '00'},
    {name: '長野', datasetFolder: 'nagano', time: '1937年', timeFolder: '01'},
    {name: '長野', datasetFolder: 'nagano', time: '1960年', timeFolder: '02'},
    {name: '長野', datasetFolder: 'nagano', time: '1972-1973年', timeFolder: '03'},
    {name: '長野', datasetFolder: 'nagano', time: '1985年', timeFolder: '04'},
    {name: '長野', datasetFolder: 'nagano', time: '2001年', timeFolder: '05'},
    {name: '福島', datasetFolder: 'fukushima', time: '1908年', timeFolder: '00'},
    {name: '福島', datasetFolder: 'fukushima', time: '1931年', timeFolder: '01'},
    {name: '福島', datasetFolder: 'fukushima', time: '1972-1973年', timeFolder: '02'},
    {name: '福島', datasetFolder: 'fukushima', time: '1983年', timeFolder: '03'},
    {name: '福島', datasetFolder: 'fukushima', time: '1996-2000年', timeFolder: '04'},
    {name: '福井', datasetFolder: 'fukui', time: '1909年', timeFolder: '2man'},
    {name: '福井', datasetFolder: 'fukui', time: '1930年', timeFolder: '00'},
    {name: '福井', datasetFolder: 'fukui', time: '1969-1973年', timeFolder: '01'},
    {name: '福井', datasetFolder: 'fukui', time: '1988-1990年', timeFolder: '02'},
    {name: '福井', datasetFolder: 'fukui', time: '1996-2000年', timeFolder: '03'},
    {name: '秋田', datasetFolder: 'akita', time: '1912年', timeFolder: '00'},
    {name: '秋田', datasetFolder: 'akita', time: '1971-1972年', timeFolder: '01'},
    {name: '秋田', datasetFolder: 'akita', time: '1985-1990年', timeFolder: '02'},
    {name: '秋田', datasetFolder: 'akita', time: '2006-2007年', timeFolder: '03'},
    {name: '盛岡', datasetFolder: 'morioka', time: '1811-1912年', timeFolder: '00'},
    {name: '盛岡', datasetFolder: 'morioka', time: '1939年', timeFolder: '01'},
    {name: '盛岡', datasetFolder: 'morioka', time: '1968-1969年', timeFolder: '02'},
    {name: '盛岡', datasetFolder: 'morioka', time: '1983-1988年', timeFolder: '03'},
    {name: '盛岡', datasetFolder: 'morioka', time: '1999-2002年', timeFolder: '04'},
    {name: '鳥取', datasetFolder: 'tottori', time: '1897年', timeFolder: '2man'},
    {name: '鳥取', datasetFolder: 'tottori', time: '1932年', timeFolder: '00'},
    {name: '鳥取', datasetFolder: 'tottori', time: '1973年', timeFolder: '01'},
    {name: '鳥取', datasetFolder: 'tottori', time: '1988年', timeFolder: '02'},
    {name: '鳥取', datasetFolder: 'tottori', time: '1999-2001年', timeFolder: '03'},
    {name: '徳島', datasetFolder: 'tokushima', time: '1896-1909年', timeFolder: '2man'},
    {name: '徳島', datasetFolder: 'tokushima', time: '1917年', timeFolder: '00'},
    {name: '徳島', datasetFolder: 'tokushima', time: '1928-1934年', timeFolder: '01'},
    {name: '徳島', datasetFolder: 'tokushima', time: '1969-1970年', timeFolder: '02'},
    {name: '徳島', datasetFolder: 'tokushima', time: '1981-1987年', timeFolder: '03'},
    {name: '徳島', datasetFolder: 'tokushima', time: '1997-2000年', timeFolder: '04'},
    {name: '高知', datasetFolder: 'kochi', time: '1906-1907年', timeFolder: '2man'},
    {name: '高知', datasetFolder: 'kochi', time: '1933年', timeFolder: '00'},
    {name: '高知', datasetFolder: 'kochi', time: '1965年', timeFolder: '01'},
    {name: '高知', datasetFolder: 'kochi', time: '1982年', timeFolder: '02'},
    {name: '高知', datasetFolder: 'kochi', time: '1998-2003年', timeFolder: '03'},
    {name: '宮崎', datasetFolder: 'miyazaki', time: '1902年', timeFolder: '00'},
    {name: '宮崎', datasetFolder: 'miyazaki', time: '1935年', timeFolder: '01'},
    {name: '宮崎', datasetFolder: 'miyazaki', time: '1962年', timeFolder: '02'},
    {name: '宮崎', datasetFolder: 'miyazaki', time: '1979年', timeFolder: '03'},
    {name: '宮崎', datasetFolder: 'miyazaki', time: '1999-2001年', timeFolder: '04'},
    {name: '山形', datasetFolder: 'yamagata', time: '1901-1903年', timeFolder: '2man'},
    {name: '山形', datasetFolder: 'yamagata', time: '1931年', timeFolder: '00'},
    {name: '山形', datasetFolder: 'yamagata', time: '1970年', timeFolder: '01'},
    {name: '山形', datasetFolder: 'yamagata', time: '1980-1989年', timeFolder: '02'},
    {name: '山形', datasetFolder: 'yamagata', time: '1999-2001年', timeFolder: '03'},
    {name: '佐賀・久留米', datasetFolder: 'saga', time: '1900-1911年', timeFolder: '2man'},
    {name: '佐賀・久留米', datasetFolder: 'saga', time: '1914-1926年', timeFolder: '00'},
    {name: '佐賀・久留米', datasetFolder: 'saga', time: '1931-1940年', timeFolder: '01'},
    {name: '佐賀・久留米', datasetFolder: 'saga', time: '1958-1964年', timeFolder: '02'},
    {name: '佐賀・久留米', datasetFolder: 'saga', time: '1977-1982年', timeFolder: '03'},
    {name: '佐賀・久留米', datasetFolder: 'saga', time: '1998-2001年', timeFolder: '04'},
    {name: '松江・米子', datasetFolder: 'matsue', time: '1915年', timeFolder: '00'},
    {name: '松江・米子', datasetFolder: 'matsue', time: '1934年', timeFolder: '01'},
    {name: '松江・米子', datasetFolder: 'matsue', time: '1975年', timeFolder: '02'},
    {name: '松江・米子', datasetFolder: 'matsue', time: '1989-1990年', timeFolder: '03'},
    {name: '松江・米子', datasetFolder: 'matsue', time: '1997-2003年', timeFolder: '04'},
    {name: '津', datasetFolder: 'tsu', time: '1892-1898年', timeFolder: '2man'},
    {name: '津', datasetFolder: 'tsu', time: '1920年', timeFolder: '00'},
    {name: '津', datasetFolder: 'tsu', time: '1937年', timeFolder: '01'},
    {name: '津', datasetFolder: 'tsu', time: '1959年', timeFolder: '02'},
    {name: '津', datasetFolder: 'tsu', time: '1980-1982年', timeFolder: '03'},
    {name: '津', datasetFolder: 'tsu', time: '1991-1999年', timeFolder: '04'},
    {name: '山口', datasetFolder: 'yamaguchi', time: '1897-1909年', timeFolder: '2man'},
    {name: '山口', datasetFolder: 'yamaguchi', time: '1922-1927年', timeFolder: '00'},
    {name: '山口', datasetFolder: 'yamaguchi', time: '1936-1951年', timeFolder: '01'},
    {name: '山口', datasetFolder: 'yamaguchi', time: '1969年', timeFolder: '02'},
    {name: '山口', datasetFolder: 'yamaguchi', time: '1983-1989年', timeFolder: '03'},
    {name: '山口', datasetFolder: 'yamaguchi', time: '2000-2001年', timeFolder: '04'},
    {name: '旭川', datasetFolder: 'asahikawa', time: '1916-1917年', timeFolder: '00'},
    {name: '旭川', datasetFolder: 'asahikawa', time: '1950-1952年', timeFolder: '01'},
    {name: '旭川', datasetFolder: 'asahikawa', time: '1972-1974年', timeFolder: '02'},
    {name: '旭川', datasetFolder: 'asahikawa', time: '1986年', timeFolder: '03'},
    {name: '旭川', datasetFolder: 'asahikawa', time: '1999-2001年', timeFolder: '04'},
    {name: '函館', datasetFolder: 'hakodate', time: '19159年', timeFolder: '00'},
    {name: '函館', datasetFolder: 'hakodate', time: '1951-1955年', timeFolder: '01'},
    {name: '函館', datasetFolder: 'hakodate', time: '1968年', timeFolder: '02'},
    {name: '函館', datasetFolder: 'hakodate', time: '1986-1989年', timeFolder: '03'},
    {name: '函館', datasetFolder: 'hakodate', time: '1996-2001年', timeFolder: '04'},
    {name: '松本', datasetFolder: 'matsumoto', time: '1910年', timeFolder: '00'},
    {name: '松本', datasetFolder: 'matsumoto', time: '1931年', timeFolder: '01'},
    {name: '松本', datasetFolder: 'matsumoto', time: '1974-1975年', timeFolder: '02'},
    {name: '松本', datasetFolder: 'matsumoto', time: '1987-1992年', timeFolder: '03'},
    {name: '松本', datasetFolder: 'matsumoto', time: '1996-2001年', timeFolder: '04'},
    {name: '佐世保', datasetFolder: 'sasebo', time: '1900-1901年', timeFolder: '2man'},
    {name: '佐世保', datasetFolder: 'sasebo', time: '1924年', timeFolder: '00'},
    {name: '佐世保', datasetFolder: 'sasebo', time: '1971年', timeFolder: '01'},
    {name: '佐世保', datasetFolder: 'sasebo', time: '1985-1987年', timeFolder: '02'},
    {name: '佐世保', datasetFolder: 'sasebo', time: '1997-1998年', timeFolder: '03'},
    {name: '弘前', datasetFolder: 'hirosaki', time: '1912年', timeFolder: '00'},
    {name: '弘前', datasetFolder: 'hirosaki', time: '1939年', timeFolder: '01'},
    {name: '弘前', datasetFolder: 'hirosaki', time: '1970-1971年', timeFolder: '02'},
    {name: '弘前', datasetFolder: 'hirosaki', time: '1980-1986年', timeFolder: '03'},
    {name: '弘前', datasetFolder: 'hirosaki', time: '1994-1997年', timeFolder: '04'},
    {name: '会津', datasetFolder: 'aizu', time: '1908-1910年', timeFolder: '00'},
    {name: '会津', datasetFolder: 'aizu', time: '1931年', timeFolder: '01'},
    {name: '会津', datasetFolder: 'aizu', time: '1972-1975年', timeFolder: '02'},
    {name: '会津', datasetFolder: 'aizu', time: '1988-1991年', timeFolder: '03'},
    {name: '会津', datasetFolder: 'aizu', time: '1997-2000年', timeFolder: '04'},
    {name: '釧路', datasetFolder: 'kushiro', time: '1897年', timeFolder: '00'},
    {name: '釧路', datasetFolder: 'kushiro', time: '1922年', timeFolder: '01'},
    {name: '釧路', datasetFolder: 'kushiro', time: '1958年', timeFolder: '02'},
    {name: '釧路', datasetFolder: 'kushiro', time: '1981年', timeFolder: '03'},
    {name: '釧路', datasetFolder: 'kushiro', time: '2001年', timeFolder: '04'},
    {name: '苫小牧', datasetFolder: 'tomakomai', time: '1896年', timeFolder: '00'},
    {name: '苫小牧', datasetFolder: 'tomakomai', time: '1935年', timeFolder: '01'},
    {name: '苫小牧', datasetFolder: 'tomakomai', time: '1954-1955年', timeFolder: '02'},
    {name: '苫小牧', datasetFolder: 'tomakomai', time: '1983-1984年', timeFolder: '03'},
    {name: '苫小牧', datasetFolder: 'tomakomai', time: '1993-999年', timeFolder: '04'},
    {name: '帯広', datasetFolder: 'obihiro', time: '1896年', timeFolder: '00'},
    {name: '帯広', datasetFolder: 'obihiro', time: '1930年', timeFolder: '01'},
    {name: '帯広', datasetFolder: 'obihiro', time: '1956-1957年', timeFolder: '02'},
    {name: '帯広', datasetFolder: 'obihiro', time: '1985年', timeFolder: '03'},
    {name: '帯広', datasetFolder: 'obihiro', time: '1998-2000年', timeFolder: '04'},
    {name: '都城', datasetFolder: 'miyakonojyou', time: '1902年', timeFolder: '00'},
    {name: '都城', datasetFolder: 'miyakonojyou', time: '1932年', timeFolder: '01'},
    {name: '都城', datasetFolder: 'miyakonojyou', time: '1966年', timeFolder: '02'},
    {name: '都城', datasetFolder: 'miyakonojyou', time: '1979-1980年', timeFolder: '03'},
    {name: '都城', datasetFolder: 'miyakonojyou', time: '1998-2001年', timeFolder: '04'},
    {name: '東予', datasetFolder: 'toyo', time: '1898-1906年', timeFolder: '00'},
    {name: '東予', datasetFolder: 'toyo', time: '1928年', timeFolder: '01'},
    {name: '東予', datasetFolder: 'toyo', time: '1966-1969年', timeFolder: '02'},
    {name: '東予', datasetFolder: 'toyo', time: '1984-1989年', timeFolder: '03'},
    {name: '東予', datasetFolder: 'toyo', time: '1994-2001年', timeFolder: '04'},
    {name: '庄内', datasetFolder: 'syonai', time: '1913年', timeFolder: '00'},
    {name: '庄内', datasetFolder: 'syonai', time: '1934年', timeFolder: '01'},
    {name: '庄内', datasetFolder: 'syonai', time: '1974年', timeFolder: '02'},
    {name: '庄内', datasetFolder: 'syonai', time: '1987年', timeFolder: '03'},
    {name: '庄内', datasetFolder: 'syonai', time: '1997-2001年', timeFolder: '04'},
    {name: '室蘭', datasetFolder: 'muroran', time: '1896年', timeFolder: '00'},
    {name: '室蘭', datasetFolder: 'muroran', time: '1917年', timeFolder: '01'},
    {name: '室蘭', datasetFolder: 'muroran', time: '1955年', timeFolder: '02'},
    {name: '室蘭', datasetFolder: 'muroran', time: '1986-1987年', timeFolder: '03'},
    {name: '室蘭', datasetFolder: 'muroran', time: '1998-2000年', timeFolder: '04'},
    {name: '近江', datasetFolder: 'omi', time: '1891-1909年', timeFolder: '2man'},
    {name: '近江', datasetFolder: 'omi', time: '1920-1922年', timeFolder: '00'},
    {name: '近江', datasetFolder: 'omi', time: '1954年', timeFolder: '01'},
    {name: '近江', datasetFolder: 'omi', time: '1967-1971年', timeFolder: '02'},
    {name: '近江', datasetFolder: 'omi', time: '1979-1986年', timeFolder: '03'},
    {name: '近江', datasetFolder: 'omi', time: '1992-1999年', timeFolder: '04'},
    {name: '岩手県南', datasetFolder: 'iwatekennan', time: '1913年', timeFolder: '00'},
    {name: '岩手県南', datasetFolder: 'iwatekennan', time: '1951年', timeFolder: '01'},
    {name: '岩手県南', datasetFolder: 'iwatekennan', time: '1968年', timeFolder: '02'},
    {name: '岩手県南', datasetFolder: 'iwatekennan', time: '1985-1986年', timeFolder: '03'},
    {name: '岩手県南', datasetFolder: 'iwatekennan', time: '1996-2001年', timeFolder: '04'},
    {name: '延岡', datasetFolder: 'nobeoka', time: '1901年', timeFolder: '00'},
    {name: '延岡', datasetFolder: 'nobeoka', time: '1932-1942年', timeFolder: '01'},
    {name: '延岡', datasetFolder: 'nobeoka', time: '1965年', timeFolder: '02'},
    {name: '延岡', datasetFolder: 'nobeoka', time: '1978年', timeFolder: '03'},
    {name: '延岡', datasetFolder: 'nobeoka', time: '1999-2000年', timeFolder: '04'},
    {name: '八代', datasetFolder: 'yatsushiro', time: '1913年', timeFolder: '00'},
    {name: '八代', datasetFolder: 'yatsushiro', time: '1951年', timeFolder: '01'},
    {name: '八代', datasetFolder: 'yatsushiro', time: '1968年', timeFolder: '02'},
    {name: '八代', datasetFolder: 'yatsushiro', time: '1983-1986年', timeFolder: '03'},
    {name: '八代', datasetFolder: 'yatsushiro', time: '1997-2000年', timeFolder: '04'},
    {name: '大牟田・島原', datasetFolder: 'omuta', time: '1910年', timeFolder: '00'},
    {name: '大牟田・島原', datasetFolder: 'omuta', time: '1941-1942年', timeFolder: '01'},
    {name: '大牟田・島原', datasetFolder: 'omuta', time: '1970年', timeFolder: '02'},
    {name: '大牟田・島原', datasetFolder: 'omuta', time: '1983-1987年', timeFolder: '03'},
    {name: '大牟田・島原', datasetFolder: 'omuta', time: '1993-1994年', timeFolder: '04'},
    {name: '大牟田・島原', datasetFolder: 'omuta', time: '1999-2000年', timeFolder: '05'},
    {name: '周南', datasetFolder: 'shunan', time: '1899年', timeFolder: '00'},
    {name: '周南', datasetFolder: 'shunan', time: '1949年', timeFolder: '01'},
    {name: '周南', datasetFolder: 'shunan', time: '1968-1969年', timeFolder: '02'},
    {name: '周南', datasetFolder: 'shunan', time: '1985年', timeFolder: '03'},
    {name: '周南', datasetFolder: 'shunan', time: '1994-2001年', timeFolder: '04'},
    {name: '米沢', datasetFolder: 'yonezawa', time: '1908-1910年', timeFolder: '00'},
    {name: '米沢', datasetFolder: 'yonezawa', time: '1952-1953年', timeFolder: '01'},
    {name: '米沢', datasetFolder: 'yonezawa', time: '1970-1973年', timeFolder: '02'},
    {name: '米沢', datasetFolder: 'yonezawa', time: '1984年', timeFolder: '03'},
    {name: '米沢', datasetFolder: 'yonezawa', time: '1999-2001年', timeFolder: '04'},
    {name: '伊那', datasetFolder: 'ina', time: '1911年', timeFolder: '00'},
    {name: '伊那', datasetFolder: 'ina', time: '1951-1952年', timeFolder: '01'},
    {name: '伊那', datasetFolder: 'ina', time: '1976年', timeFolder: '02'},
    {name: '伊那', datasetFolder: 'ina', time: '1987-1990年', timeFolder: '03'},
    {name: '伊那', datasetFolder: 'ina', time: '1998-2001年', timeFolder: '04'},
    {name: '伊賀', datasetFolder: 'iga', time: '1892年', timeFolder: '00'},
    {name: '伊賀', datasetFolder: 'iga', time: '1937年', timeFolder: '01'},
    {name: '伊賀', datasetFolder: 'iga', time: '1968年', timeFolder: '02'},
    {name: '伊賀', datasetFolder: 'iga', time: '1980-1986年', timeFolder: '03'},
    {name: '伊賀', datasetFolder: 'iga', time: '1996-2001年', timeFolder: '04'},
]
console.log(konUrls.length)

konUrls = konUrls.map(url => {
    const times = url.time.replace('年','').split('-')
    return {
        name: url.name,
        time: url.time,
        id:'oh-kon-' + url.name + '-source-' + url.timeFolder,
        source: 'oh-kon-' + url.name + '-source-' + url.timeFolder,
        tiles: ['https://ktgis.net/kjmapw/kjtilemap/' + url.datasetFolder + '/' + url.timeFolder + '/{z}/{x}/{y}.png'],
        timeStart: Number(times[0]),
        timeEnd: isNaN(Number(times[1])) ? Number(times[0]) :Number(times[1])
    }
})

const konSources = []
const konLayers = []
konUrls.forEach(url => {
    konSources.push({
        id: url.id,
        obj:{
            type: 'raster',
            tiles: url.tiles,
            scheme: 'tms',
        }
    })
    konLayers.push({
        id: url.id,
        source: url.source,
        name0: url.name,
        name: url.name + url.time,
        type: 'raster',
    })
})
const konLayers2 = konLayers.map((layer,i) => {
    return {
        id: layer.id,
        name: layer.name0,
        label: layer.name,
        source: konSources[i],
        layers:[layer],
        attribution: "<a href='https://ktgis.net/kjmapw/tilemapservice.html' target='_blank'>今昔マップ</a>",
    }
})
// 親ノードごとにグループ化する
const groupedLayers = konLayers2.reduce((acc, layer) => {
    // 親ノードを `name` フィールドでグループ化
    if (!acc[layer.name]) {
        acc[layer.name] = {
            id: 'kon-' + layer.name,      // 親ノードの ID
            label: layer.name,            // 親ノードのラベル
            nodes: [],                    // 子ノードとしてレイヤーを格納する配列
        };
    }
    acc[layer.name].nodes.push(layer);    // 子ノードとして追加
    return acc;
}, {});
// オブジェクトを配列に変換
const konjyakuMapWithParentNodes = Object.values(groupedLayers);

// 「今昔マップ」の親ノードとしてまとめる
const konjyakuMap = {
    id: 'konjyaku',
    label: "今昔マップ",
    nodes: konjyakuMapWithParentNodes
};

// 戦後米軍地図-----------------------------------------------------------------------------------------------------------
const urls =[
    {name:'宮崎市',url:'https://kenzkenz2.xsrv.jp/usarmy/miyazaki/{z}/{x}/{y}.png',tms:true,bounds:[131.38730562869546, 31.94874904974968, 131.47186495009896, 31.85909130381588]},
    {name:'延岡市',url:'https://kenzkenz2.xsrv.jp/usarmy/nobeoka/{z}/{x}/{y}.png',tms:true,bounds: [131.63757572120534, 32.62500535406083, 131.72436281180384, 32.54331840955494]},
    {name:'都城市',url:'https://t.tilemap.jp/jcp_maps/miyakonojo/{z}/{x}/{y}.png',tms:true,bounds: [131.01477802559293, 31.759362148868007, 131.10179776971427, 31.69135798671786]},
    {name:'鹿児島市',url:'https://kenzkenz2.xsrv.jp/usarmy/kagosima/{z}/{x}/{y}.png',tms:true,bounds: [130.5199329928549, 31.625904260596627, 130.60040625640664, 31.53839471681782]},
    {name:'室蘭市',url:'https://t.tilemap.jp/jcp_maps/muroran/{z}/{x}/{y}.png',tms:true,bounds: [140.90440038348575, 42.38405121586513, 141.05923356332505, 42.29059914480226]},
    {name:'明石市',url:'https://t.tilemap.jp/jcp_maps/akashi/{z}/{x}/{y}.png',tms:true,bounds: [134.9178464474012, 34.710923217623645, 135.04999909886737, 34.6239626197396]},
    {name:'相生市',url:'https://t.tilemap.jp/jcp_maps/harima/{z}/{x}/{y}.png',tms:true,bounds: [134.40899456747056, 34.827906424389056, 134.51680327661515, 34.734588690535986]},
    {name:'秋田市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/akita/{z}/{x}/{y}.png',tms:false,bounds:[140.0717562014137, 39.73918236291928, 140.14706081310268, 39.6820763867207]},
    {name:'青森市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/aomori/{z}/{x}/{y}.png',tms:false,bounds: [140.70599744657008, 40.85260097581303, 140.79743395188777, 40.7935556203787]},
    {name:'旭川市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/asahikawa/{z}/{x}/{y}.png',tms:false,bounds: [142.30618215432563, 43.8296431351975, 142.425113984255, 43.7268853650624]},
    {name:'千葉市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/chiba/{z}/{x}/{y}.png',tms:false,bounds: [140.08764378681573,35.62917380173154, 140.15972144856843,35.554932756846156]},
    {name:'富士宮市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/fujinomiya/{z}/{x}/{y}.png',tms:false,bounds: [138.5809732397614,35.25121212484136, 138.6515394767342,35.18069262503313]},
    {name:'福井市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/fukui/{z}/{x}/{y}.png',tms:false,bounds: [136.16942055402976,36.0976050324894, 136.25602908312064,36.01592560352381]},
    {name:'福島市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/fukushima/{z}/{x}/{y}.png',tms:false,bounds: [140.44319076482216,37.78090343507313, 140.5007616991178,37.72953717372495]},
    {name:'伏木',url:'https://kenzkenz3.xsrv.jp/jcp_maps/fushiki/{z}/{x}/{y}.png',tms:false,bounds: [137.02508679699687,36.8245491449906, 137.1126408047655,36.7604369200003]},
    {name:'岐阜市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/gifu/{z}/{x}/{y}.png',tms:false,bounds: [136.70751515094838,35.470986568936624, 136.82609225873549,35.37258621685527]},
    {name:'habu',url:'https://kenzkenz3.xsrv.jp/jcp_maps/habu/{z}/{x}/{y}.png',tms:false,bounds: [133.1350108897345,34.32262791592599, 133.2262140428679,34.24586042631]},
    {name:'八戸市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hachinohe/{z}/{x}/{y}.png',tms:false,bounds: [141.4589812322207,40.56255590542611, 141.57631044226363,40.48799652674896]},
    {name:'萩市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hagi/{z}/{x}/{y}.png',tms:false,bounds:[131.3620548860769,34.4605107256224, 131.43111774489685,34.38617650807586] },
    {name:'函館市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hakodate/{z}/{x}/{y}.png',tms:false,bounds: [140.68097748426095,41.82926676413055, 140.7901943531384,41.73143517073271] },
    {name:'半田市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/handa/{z}/{x}/{y}.png',tms:false,bounds: [136.89242595186886,34.945077593842996, 137.00722449770626,34.85734903493045]},
    {name:'東岩瀬',url:'https://kenzkenz3.xsrv.jp/jcp_maps/higashiiwase/{z}/{x}/{y}.png',tms:false,bounds: [137.16815167238158,36.78583199289653, 137.25717016627235,36.71700039282162]},
    {name:'彦根市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hikone/{z}/{x}/{y}.png',tms:false,bounds: [136.1900204514088,35.32992409688262, 136.30520216294815,35.224721393195296]},
    {name:'姫路市',url:'https://t.tilemap.jp/jcp_maps/himeji/{z}/{x}/{-y}.png',tms:false,bounds: [134.64098624425583, 34.8708631072014, 134.7378282897613, 34.80268817759354]},
    {name:'枚方市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hirakata/{z}/{x}/{y}.png',tms:false,bounds:[135.57194920276365,34.87011100775344, 135.68724932168683,34.800562973217296]},
    {name:'平塚市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hiratsuka/{z}/{x}/{y}.png',tms:false,bounds: [139.31229120023235,35.35904999646574, 139.3878805441378,35.28874804475291]},
    {name:'広町',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hiromachi/{z}/{x}/{y}.png',tms:false,bounds: [132.5731525471544,34.26760068261592, 132.67292535809037,34.1905277967504]},
    {name:'弘前市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hirosaki/{z}/{x}/{y}.png',tms:false,bounds: [140.4235199121323,40.631355509931836, 140.5010183369034,40.56109320751867]},
    {name:'広島市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hiroshima/{z}/{x}/{y}.png',tms:false,bounds: [132.3884909359741,34.431458513241665, 132.52820720355984,34.330487127792665]},
    {name:'日立市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hitachi/{z}/{x}/{y}.png',tms:false,bounds: [140.57999833282472,36.64482954491233, 140.6999440377617,36.53230602703728]},
    {name:'人吉市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/hitoyoshi/{z}/{x}/{y}.png',tms:false,bounds: [130.73763423508643,32.2355050464609, 130.79378929829835,32.1887013821016]},
    {name:'一宮市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/ichinomiya/{z}/{x}/{y}.png',tms:false,bounds: [136.73726867270835,35.34563130774367, 136.8879913849867,35.19549105733337]},
    {name:'諫早市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/isahaya/{z}/{x}/{y}.png',tms:false,bounds: [130.02394444628715,32.86659294976408, 130.108573505125,32.81428582145436]},
    {name:'飯塚市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/iizuka/{z}/{x}/{y}.png',tms:false,bounds: [130.65216494469635,33.671544924421084, 130.71290557949533,33.589367508699866]},
    {name:'加治木',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kajiki/{z}/{x}/{y}.png',tms:false,bounds: [130.6334297037225,31.757366116931934, 130.6942427581649,31.706007526498084]},
    {name:'釜石市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kamaishi/{z}/{x}/{y}.png',tms:false,bounds: [141.83555625727507,39.29839433432599, 141.9190507416997,39.24137226047998]},
    {name:'金沢市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kanazawa/{z}/{x}/{y}.png',tms:false,bounds: [136.57678119459374,36.616141434534484, 136.70692666986213,36.51525054188362]},
    {name:'苅田町',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kanda/{z}/{x}/{y}.png',tms:false,bounds: [130.94005143590758,33.81584169930497, 131.02026222594566,33.747149681232116]},
    {name:'唐津市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/karatsu/{z}/{x}/{y}.png',tms:false,bounds: [129.921021511898,33.50559209417867, 130.005309930191,33.43203779434077]},
    {name:'刈谷市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kariya/{z}/{x}/{y}.png',tms:false,bounds: [136.94200877634015,35.03318584159486, 137.0601647773119,34.959046536665284]},
    {name:'柏崎市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kashiwazaki/{z}/{x}/{y}.png',tms:false,bounds: [138.50568101943807,37.40203383548953, 138.59532647968607,37.342488307171394]},
    {name:'川越市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kawagoe/{z}/{x}/{y}.png',tms:false,bounds: [139.4570958921943,35.942500179173905, 139.52681723332742,35.87309357493287]},
    {name:'豊田市（挙母）',url:'https://kenzkenz3.xsrv.jp/jcp_maps/koromo/{z}/{x}/{y}.png',tms:false,bounds: [137.08772963931085,35.13859479723625, 137.1960466270638,35.027068132737384]},
    {name:'下松市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kudamatsu/{z}/{x}/{y}.png',tms:false,bounds: [131.8186521172428,34.038862259919966, 131.89699206649303,33.96796119128024]},
    {name:'桑名市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kuwana/{z}/{x}/{y}.png',tms:false,bounds: [136.61704718511825,35.13788876963871, 136.77256971042877,34.97847375883852]},
    {name:'高知市',url:'https://t.tilemap.jp/jcp_maps/kochi/{z}/{x}/{y}.png',tms:true,bounds: [133.4697604427741, 33.593332069856146, 133.58746118164257, 33.48248877930844]},
    {name:'甲府市',url:'https://t.tilemap.jp/jcp_maps/kofu/{z}/{x}/{y}.png',tms:true,bounds: [138.5192430532455, 35.713904772878024, 138.61371447806357, 35.62085584514263]},
    {name:'小倉',url:'https://t.tilemap.jp/jcp_maps/kokura/{z}/{x}/{y}.png',tms:true,bounds: [130.83351113737584, 33.92073003726122, 130.95307633268283, 33.83365615261114]},
    {name:'郡山市',url:'https://t.tilemap.jp/jcp_maps/koriyama/{z}/{x}/{y}.png',tms:true,bounds: [140.33108953120356, 37.43688472335944, 140.4249240446428, 37.367662796402]},
    {name:'熊本市',url:'https://t.tilemap.jp/jcp_maps/kumamoto/{z}/{x}/{y}.png',tms:true,bounds: [130.6754534531498, 32.83726270469704, 130.77889418491364, 32.75070766375866]},
    {name:'久留米市',url:'https://t.tilemap.jp/jcp_maps/kurume/{z}/{x}/{y}.png',tms:true,bounds: [130.4842734730671, 33.33550789416525, 130.58554027442437, 33.26640037986165]},
    {name:'釧路市',url:'https://t.tilemap.jp/jcp_maps/kushiro/{z}/{x}/{y}.png',tms:true,bounds: [144.34146030236244, 43.03742598091131, 144.44208605576515, 42.94577285147719]},
    {name:'京都市(北)',url:'https://t.tilemap.jp/jcp_maps/kyoto_north/{z}/{x}/{y}.png',tms:true,bounds: [135.69243533265592, 35.07483494738305, 135.80488895726202, 34.98779081635700]},
    {name:'京都市(南)',url:'https://t.tilemap.jp/jcp_maps/kyoto_south/{z}/{x}/{y}.png',tms:true,bounds: [135.6943010138845, 34.996985089808334, 135.80539677017686, 34.916474628902776]},
    {name:'前橋市',url:'https://t.tilemap.jp/jcp_maps/maebashi/{z}/{x}/{y}.png',tms:true,bounds: [139.03692848520149, 36.42476537937992, 139.10921177449703, 36.36642121340162]},
    {name:'枕崎市',url:'https://t.tilemap.jp/jcp_maps/makurazaki/{z}/{x}/{y}.png',tms:true,bounds: [130.27057404867296, 31.293447219997688, 130.3296372970093, 31.248059353360432]},
    {name:'松江市',url:'https://t.tilemap.jp/jcp_maps/matsue/{z}/{x}/{y}.png',tms:true,bounds: [132.99721215263972, 35.49991858248744, 133.10912531212935, 35.42483380090842]},
    {name:'三原市',url:'https://t.tilemap.jp/jcp_maps/mihara_itozaki/{z}/{x}/{y}.png',tms:true,bounds: [133.02333144783972, 34.425199058736396, 133.13130511283873, 34.356677113032205]},
    {name:'水戸市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/mito/{z}/{x}/{y}.png',tms:false,bounds: [140.4179578231387, 36.413769771836456, 140.545391585093, 36.350511004933594]},
    {name:'長野市',url:'https://t.tilemap.jp/jcp_maps/nagano/{z}/{x}/{y}.png',tms:true,bounds: [138.14073032198428, 36.69619682804296, 138.2340108459997, 36.615546045100615]},
    {name:'長岡市',url:'https://t.tilemap.jp/jcp_maps/nagaoka/{z}/{x}/{y}.png',tms:true,bounds: [138.81563140898004, 37.48632713465814, 138.87307359724298, 37.41690979613216]},
    {name:'長崎市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/nagasaki/{z}/{x}/{y}.png',tms:false,bounds: [129.82426933289048, 32.80116245898009, 129.92143838942525, 32.69767898831918]},
    {name:'名古屋市(北東)',url:'https://t.tilemap.jp/jcp_maps/nagoya_ne/{z}/{x}/{y}.png',tms:true,bounds: [136.8897098705461, 35.22421193160979, 136.98818271993733, 35.13233810303973]},
    {name:'名古屋市(北西)',url:'https://t.tilemap.jp/jcp_maps/nagoya_nw/{z}/{x}/{y}.png',tms:true,bounds: [136.80611080422372, 35.225824131738065, 136.90547197474476, 35.13243456671647]},
    {name:'名古屋市(南東)',url:'https://t.tilemap.jp/jcp_maps/nagoya_se/{z}/{x}/{y}.png',tms:true,bounds: [136.88919877397763, 35.14167895962797, 136.98842441427456, 35.04951319684166]},
    {name:'名古屋市(南西)',url:'https://t.tilemap.jp/jcp_maps/nagoya_sw/{z}/{x}/{y}.png',tms:true,bounds: [136.80523113396558, 35.141184354273065, 136.90487806511402, 35.048543288426316]},
    {name:'七尾市',url:'https://t.tilemap.jp/jcp_maps/nanao/{z}/{x}/{y}.png',tms:true,bounds: [136.90164078074454, 37.09788232838679, 137.0370105286217, 37.0228343649801]},
    {name:'直江津',url:'https://kenzkenz3.xsrv.jp/jcp_maps/naoetsu/{z}/{x}/{y}.png',tms:false,bounds: [138.20747979491517,37.20133085529935, 138.27912193297908,37.1554182778262]},
    {name:'新潟市',url:'https://t.tilemap.jp/jcp_maps/niigata/{z}/{x}/{y}.png',tms:true,bounds: [138.99186708819562, 37.96788748388437, 139.0933551717966, 37.8983254944878]},
    {name:'新居浜市',url:'https://t.tilemap.jp/jcp_maps/niihama/{z}/{x}/{y}.png',tms:true,bounds: [133.22255519907048, 34.00367828974015, 133.31210141758493, 33.92086221440381]},
    {name:'日光市',url:'https://t.tilemap.jp/jcp_maps/nikko/{z}/{x}/{y}.png',tms:true,bounds: [139.48407988645982, 36.78855612641945, 139.64399721124124, 36.71216243946745]},
    {name:'直方市',url:'https://t.tilemap.jp/jcp_maps/nogata/{z}/{x}/{y}.png',tms:true,bounds: [130.69598996782418, 33.77216740394658, 130.75809919977306, 33.71618955385571]},
    {name:'沼津市',url:'https://t.tilemap.jp/jcp_maps/numazu/{z}/{x}/{y}.png',tms:true,bounds: [138.8324112693624, 35.1277526279410, 138.89685871702, 35.06471308977173]},
    {name:'大垣市',url:'https://t.tilemap.jp/jcp_maps/ogaki/{z}/{x}/{y}.png',tms:true,bounds: [136.55413836399077, 35.40195135119643, 136.66695408681392, 35.33227207940551]},
    {name:'大分市',url:'https://t.tilemap.jp/jcp_maps/oita/{z}/{x}/{y}.png',tms:true,bounds: [131.55698081039802, 33.27340799027354, 131.65331704103366, 33.203760920003575]},
    {name:'岡山市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/okayama/{z}/{x}/{y}.png',tms:false,bounds: [133.87770654276844,34.708880685750856, 133.97912757114406,34.6163776195384]},
    {name:'桶川市',url:'https://t.tilemap.jp/jcp_maps/okegawa/{z}/{x}/{y}.png',tms:true,bounds: [139.52177323905948, 36.0269588999937, 139.6205921455574, 35.95245423653812]},
    {name:'大湊',url:'https://kenzkenz3.xsrv.jp/jcp_maps/ominato/{z}/{x}/{y}.png',tms:false,bounds: [141.10173496456386, 41.30304157411669, 141.22543978543519, 41.20456356172045]},
    {name:'大村市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/omura/{z}/{x}/{y}.png',tms:false,bounds: [129.89270322251053, 32.95816906007779, 129.98746633755894, 32.8826256032659]},
    {name:'大牟田市',url:'https://t.tilemap.jp/jcp_maps/omuta/{z}/{x}/{y}.png',tms:true,bounds: [130.37973611582464, 33.056731972736316, 130.48797531951612, 32.98711858353457]},
    {name:'山陽小野田市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/onoda/{z}/{x}/{y}.png',tms:false,bounds: [131.13791842343807,34.01405470527139, 131.20457467021942,33.944588710860714]},
    {name:'小樽市',url:'https://t.tilemap.jp/jcp_maps/otaru/{z}/{x}/{y}.png',tms:true,bounds: [140.95003125711892, 43.2498339236171, 141.06840585812543, 43.1510898825083]},
    {name:'大津市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/otsu/{z}/{x}/{y}.png',tms:false,bounds: [135.8276778607642,35.04236537027731, 135.9406216590678,34.950260003281315]},
    {name:'留萌市',url:'https://t.tilemap.jp/jcp_maps/rumoi/{z}/{x}/{y}.png',tms:true,bounds: [141.6042188327817, 43.98252204659977, 141.70030494742667, 43.90720818339608]},
    {name:'佐伯市',url:'https://t.tilemap.jp/jcp_maps/saeki/{z}/{x}/{y}.png',tms:true,bounds: [131.85777088174342, 32.99383225285267, 131.93490104102835, 32.90668177072595]},
    {name:'酒田市',url:'https://t.tilemap.jp/jcp_maps/sakata/{z}/{x}/{y}.png',tms:true,bounds: [139.79572723006245, 38.94697215540117, 139.86472236310482, 38.893991742680754]},
    {name:'札幌市',url:'https://t.tilemap.jp/jcp_maps/sapporo/{z}/{x}/{y}.png',tms:true,bounds: [141.2872269967413, 43.12652987403498, 141.4241048765094, 43.0095195482877]},
    {name:'佐世保市',url:'https://t.tilemap.jp/jcp_maps/sasebo/{z}/{x}/{y}.png',tms:true,bounds: [129.67363106960568, 33.21108635181264, 129.77110120410237, 33.10068154282844]},
    {name:'薩摩川内市',url:'https://t.tilemap.jp/jcp_maps/satsuma_sendai/{z}/{x}/{y}.png',tms:true,bounds: [130.2660942035549, 31.84126574443949, 130.32700482335025, 31.789400580167452]},
    {name:'仙台市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/sendai/{z}/{x}/{y}.png',tms:false,bounds: [140.82992065404846, 38.293472864168336, 140.9386044338842, 38.20103124986022]},
    {name:'飾磨',url:'https://t.tilemap.jp/jcp_maps/shikama/{z}/{x}/{y}.png',tms:true,bounds: [134.57381908301352, 34.830801155046686, 134.69907891456126, 34.7487640772753]},
    {name:'島原市',url:'https://t.tilemap.jp/jcp_maps/shimabara/{z}/{x}/{y}.png',tms:true,bounds: [130.33991189911603, 32.80562992452464, 130.40247509494066, 32.75341095906735]},
    {name:'清水市',url:'https://t.tilemap.jp/jcp_maps/shimizu/{z}/{x}/{y}.png',tms:true,bounds: [138.44154622744944, 35.05407685272354, 138.53987265717413, 34.97184831284642]},
    {name:'下関市',url:'https://t.tilemap.jp/jcp_maps/shimonoseki_moji/{z}/{x}/{y}.png',tms:true,bounds: [130.86186034693543, 33.99364348447547, 130.99910898222745, 33.9010277531139]},
    {name:'吹田市',url:'https://t.tilemap.jp/jcp_maps/suita/{z}/{x}/{y}.png',tms:true,bounds: [135.46811271576692, 34.81241595216801, 135.58729734389593, 34.73599802051933]},
    {name:'高田市',url:'https://t.tilemap.jp/jcp_maps/takada/{z}/{x}/{y}.png',tms:true,bounds: [138.2140323701369, 37.14730687866512, 138.28622804908625, 37.08329203410612]},
    {name:'高松市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/takamatsu/{z}/{x}/{y}.png',tms:false,bounds: [133.99545893909394,34.39269918414061, 134.11711991669594,34.301570982649295]},
    {name:'高砂市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/takasago/{z}/{x}/{y}.png\'',tms:false,bounds: [134.74741530689215,34.79614117291294, 134.91089795800664,34.698735552479135]},
    {name:'高崎市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/takasaki/{z}/{x}/{y}.png',tms:false,bounds: [138.97691229387246,36.35389563865152, 139.03623605175935,36.294564407602934]},
    {name:'鳥羽市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/toba/{z}/{x}/{y}.png',tms:false,bounds: [136.80242859001117,34.5282360211439, 136.8797379004474,34.4474052593944]},
    {name:'玉野市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tomano/{z}/{x}/{y}.png',tms:false,bounds: [133.8988852990205,34.519890070517164, 133.99005626564573,34.436591886068825]},
    {name:'徳島市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tokushima/{z}/{x}/{y}.png',tms:false,bounds: [134.4936030594145,34.12235468581463, 134.61755866682876,34.02929803919676]},
    {name:'徳山',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tokuyama/{z}/{x}/{y}.png',tms:false,bounds: [131.74538715278192,34.08462384762474, 131.84149338399453,33.99426773843973]},
    {name:'鳥取市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tottori/{z}/{x}/{y}.png',tms:false,bounds: [134.1900909428445,35.52696479360749, 134.28330172942555,35.46730267834758]},
    {name:'富山市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/toyama/{z}/{x}/{y}.png',tms:false,bounds:[137.1684165214623,36.72884284984751, 137.25429548970115,36.66525139660453]},
    {name:'豊橋市(北)',url:'https://kenzkenz3.xsrv.jp/jcp_maps/toyohashi_north/{z}/{x}/{y}.png',tms:false,bounds: [137.30419119783116,34.79819174398203, 137.4371489692516,34.699863481299786]},
    {name:'豊橋市(南)',url:'https://kenzkenz3.xsrv.jp/jcp_maps/toyohashi_south/{z}/{x}/{y}.png',tms:false,bounds: [137.3040570873804,34.77214256985337, 137.4375519711561,34.67231637720508]},
    {name:'豊川市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/toyokawa/{z}/{x}/{y}.png',tms:false,bounds: [137.3300625528809,34.87697931243254, 137.4370303894993,34.78739376103327]},
    {name:'土崎',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tsuchizaki/{z}/{x}/{y}.png',tms:false,bounds: [140.0322280044941,39.77748578452113, 140.10570276186743,39.73013139828953]},
    {name:'敦賀市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tsuruga/{z}/{x}/{y}.png',tms:false,bounds: [136.02015594007466,35.67725529086043, 136.1043337172458,35.61019094654843]},
    {name:'津山市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tsuyama/{z}/{x}/{y}.png',tms:false,bounds: [133.9546515527164,35.093894098921695, 134.05467984406104,35.028394837132595]},
    {name:'宇部市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/ube/{z}/{x}/{y}.png',tms:false,bounds: [131.21090737917757,33.985496410975, 131.27556202748153,33.91514344585086]},
    {name:'魚津市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/uotsu/{z}/{x}/{y}.png',tms:false,bounds: [137.359654715174,36.84154335048109, 137.4231533313926,36.78819929793053]},
    {name:'宇都宮市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/utsunomiya/{z}/{x}/{y}.png',tms:false,bounds: [139.80726931534997,36.60692094994177, 139.94236346625078,36.51922096392269]},
    {name:'会津若松市',url:'https://t.tilemap.jp/jcp_maps/wakamatsu/{z}/{x}/{y}.png',tms:true,bounds: [139.89971460019447, 37.5246569332612, 139.9580861738811, 37.4662552780602]},
    {name:'和歌山市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/wakayama/{z}/{x}/{y}.png',tms:false,bounds: [135.10168442914156,34.278745841537926, 135.2230356116023,34.16603880752899]},
    {name:'山形市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yamagata/{z}/{x}/{y}.png',tms:false,bounds: [140.31046887145618,38.2869380235048, 140.37764680789093,38.223610501260254]},
    {name:'山口市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yamaguchi/{z}/{x}/{y}.png',tms:false,bounds: [131.44143730059048,34.20638353543529, 131.50447591796302,34.15296649850379]},
    {name:'八幡',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yawata/{z}/{x}/{y}.png',tms:false,bounds: [130.7352353711359,33.93668107746137, 130.8548940797083,33.848555614389184]},
    {name:'八代市',url:'https://t.tilemap.jp/jcp_maps/yatsushiro/{z}/{x}/{y}.png',tms:true,bounds: [130.56782128418257, 32.52529691909547, 130.64291911328604, 32.4722538224630]},
    {name:'四日市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yokkaichi/{z}/{x}/{y}.png',tms:false,bounds: [136.5812700596467,34.997838813507684, 136.66969176203165,34.92287302729859]},
    {name:'米子市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yonago/{z}/{x}/{y}.png',tms:false,bounds: [133.28164837924874,35.480611440807465, 133.3806044575397,35.397899772912595]},
    {name:'善通寺市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/zentsuji/{z}/{x}/{y}.png',tms:false,bounds: [133.74462727940428,34.25811177699647, 133.81558511889327,34.199615898483586]},
    {name:'高鍋町',url:'https://t.tilemap.jp/jcp_maps/takanabe/{z}/{x}/{y}.png',tms:true,bounds: [131.49437198658654, 32.14926230220921, 131.55480667761816, 32.097161098583]},
    {name:'高岡',url:'https://t.tilemap.jp/jcp_maps/takaoka/{z}/{x}/{y}.png',tms:true,bounds: [136.95122553245773, 36.78462123872494, 137.07285137091316, 36.72027436365445]},
    {name:'大宮',url:'https://kenzkenz3.xsrv.jp/jcp_maps/omiya/{z}/{x}/{y}.png',tms:false,bounds: [139.58288807604737, 35.936471778972816, 139.68984384272522, 35.82067028475796]},
    {name:'板橋区',url:'https://kenzkenz3.xsrv.jp/jcp_maps/itabashi/{z}/{x}/{y}.png',tms:false,bounds: [139.55659942810058, 35.84279388096407, 139.6851201552582, 35.74376046340615]},
    {name:'川口市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kawaguchi/{z}/{x}/{y}.png',tms:false,bounds: [139.67232242769714, 35.8422159012266, 139.8030720705461, 35.74493041694202]},
    {name:'松戸市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/matsudo/{z}/{x}/{y}.png',tms:false,bounds: [139.787265544735, 35.84270580004852, 139.92278817852593, 35.74447067756418]},
    {name:'立川市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tachikawa/{z}/{x}/{y}.png',tms:false,bounds: [139.3257750300442, 35.7677794416578, 139.45130978801595, 35.66939179444587]},
    {name:'田無',url:'https://kenzkenz3.xsrv.jp/jcp_maps/tanashi/{z}/{x}/{y}.png',tms:false,bounds: [139.4374114036049, 35.768251043426986, 139.57501073772565, 35.6676261138138]},
    {name:'中野区',url:'https://kenzkenz3.xsrv.jp/jcp_maps/nakano/{z}/{x}/{y}.png',tms:false,bounds: [139.55876057440844, 35.766645453219354, 139.6859080105504, 35.66883929724342]},
    {name:'小石川',url:'https://kenzkenz3.xsrv.jp/jcp_maps/koishikawa/{z}/{x}/{y}.png',tms:false,bounds: [139.67579968662739, 35.7659536404624, 139.8011419961023, 35.67149249224876]},
    {name:'本所',url:'https://kenzkenz3.xsrv.jp/jcp_maps/honjo/{z}/{x}/{y}.png',tms:false,bounds: [139.78699439491749, 35.76692444138439, 139.92178432779318, 35.66956521078299]},
    {name:'調布',url:'https://kenzkenz3.xsrv.jp/jcp_maps/chofu/{z}/{x}/{y}.png',tms:false,bounds: [139.43793800309393, 35.69264409802105, 139.5735330565283, 35.5942285900592]},
    {name:'世田谷区',url:'https://kenzkenz3.xsrv.jp/jcp_maps/setagaya/{z}/{x}/{y}.png',tms:false,bounds: [139.55750953987325, 35.69020645502415, 139.68686778679574, 35.59558138323757]},
    {name:'日本橋',url:'https://kenzkenz3.xsrv.jp/jcp_maps/nihonbashi/{z}/{x}/{y}.png',tms:false,bounds: [139.67133578494247, 35.691982412751216, 139.8057094274467, 35.59480793294374]},
    {name:'砂町',url:'https://kenzkenz3.xsrv.jp/jcp_maps/sunamachi/{z}/{x}/{y}.png',tms:false,bounds: [139.7912620438637, 35.6927029142241, 139.9203983379902, 35.595771132326846]},
    {name:'田園調布',url:'https://kenzkenz3.xsrv.jp/jcp_maps/denen/{z}/{x}/{y}.png',tms:false,bounds: [139.5552674729985, 35.61684183769074, 139.68731262280164, 35.520543926413254]},
    {name:'大森',url:'https://kenzkenz3.xsrv.jp/jcp_maps/omori/{z}/{x}/{y}.png',tms:false,bounds: [139.67116572453156, 35.61793041851628, 139.80602518214357, 35.53127408650961]},
    {name:'川崎',url:'https://kenzkenz3.xsrv.jp/jcp_maps/kawasaki/{z}/{x}/{y}.png',tms:false,bounds: [139.67419982036674, 35.54299845717924, 139.80459004720768, 35.4553511140454]},
    {name:'横浜市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yokohama/{z}/{x}/{y}.png',tms:false,bounds: [139.55378204664274, 35.466367420903566, 139.689263106194, 35.37842491230309]},
    {name:'根岸湾',url:'https://kenzkenz3.xsrv.jp/jcp_maps/negishi/{z}/{x}/{y}.png',tms:false,bounds: [139.56020459612833, 35.4006437745536, 139.68445926984774, 35.30432787941882]},
    {name:'横須賀市',url:'https://kenzkenz3.xsrv.jp/jcp_maps/yokosuka/{z}/{x}/{y}.png',tms:false,bounds: [139.60289262315248, 35.342237358161995, 139.72813703199841, 35.24850065660095]},
    {name:'浦賀',url:'https://kenzkenz3.xsrv.jp/jcp_maps/uraga/{z}/{x}/{y}.png',tms:false,bounds: [139.65567449304083, 35.29220632171602, 139.75966105433923, 35.179361639527656]},
]
const amsSources = []
const amsLayers = []
urls.forEach(url => {
    function compareFunc(a, b) {
        return a - b;
    }
    url.bounds.sort(compareFunc);
    url.bounds = [url.bounds[2],url.bounds[0],url.bounds[3],url.bounds[1]]
    if (!url.tms) {
        amsSources.push({
            id: 'oh-ams-' + url.name,
            obj:{
                type: 'raster',
                tiles: [url.url],
                minzoom: 0,
                bounds: url.bounds,
            }
        })
    } else {
        amsSources.push({
            id: 'oh-ams-' + url.name,
            obj:{
                type: 'raster',
                tiles: [url.url],
                scheme: 'tms',
                minzoom: 0,
                bounds: url.bounds,
            }
        })
    }
    amsLayers.push({
        id: 'oh-' + url.name,
        source: 'oh-ams-' + url.name,
        type: 'raster',
    })
})
const amsLayers2 = amsLayers.map((layer,i) => {
    return {
        id: layer.id,
        label: layer.id.replace('oh-','') + '戦後米軍地図',
        source: amsSources[i],
        layers:[layer]
    }
})
// 古地図----------------------------------------------------------------------------------------------------------------
// 戦前の旧版地形図
const mw5DummySource = {
    id:'mw5DummySource',obj:{
        type: 'raster',
        tileSize: 256
    }
}
const mw5DummyLayer = {
    'id': 'oh-mw-dummy',
    'source': mw5DummySource,
    'type': 'raster',
}
const mw5CenterSource = {
    id: 'mw5CenterSource', obj: {
        'type': 'geojson',
        'data': 'https://kenzkenz.xsrv.jp/open-hinata/geojson/mw5centerNew.geojson',
    }
}
const mw5CenterLabel = {
    id: "oh-mw5-center",
    type: "symbol",
    source: "mw5CenterSource",
    'layout': {
        'text-field': ['get', 'title'],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 7
}
// 北海道----------------------------------------------------------------------------------------------------------
const jissokuSource = {
    id: 'jissoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/jissoku/{z}/{x}/{y}.png'],
    }
}
const jissokuLayer = {
    'id': 'oh-jissoku-layer',
    'type': 'raster',
    'source': 'jissoku-source',
}
const jissokuMatsumaeSource = {
    id: 'jissoku-matsumae-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/jissokumatsumae/{z}/{x}/{y}.png'],
        tileSize: 256
    }
}
const jissokuMatsumaeLayer = {
    'id': 'oh-jissoku-matsumae-layer',
    'type': 'raster',
    'source': 'jissoku-matsumae-source',
}
// 迅速測図----------------------------------------------------------------------------------------------
const jinsokuSource = {
    id: 'jinsoku-source', obj: {
        type: 'raster',
        tiles: ['https://boiledorange73.sakura.ne.jp/ws/tile/Kanto_Rapid-900913/{z}/{x}/{y}.png'],
    }
}
const jinsokuLayer = {
    'id': 'oh-jinsoku-layer',
    'type': 'raster',
    'source': 'jinsoku-source',
}


// ---------------------------------------------------------------------------------------------------------------------
// syochiikiソース
const syochiikiSource = {
    id: "syochiikiSource", obj:{
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/syochiiki/syochiiki.pmtiles",
        attribution: '<a href="https://github.com/shiwaku/mlit-plateau-bldg-pmtiles">mlit-plateau-bldg-pmtiles</a>'
    }
}
const syochiikiLayer = {
    'id': 'oh-syochiiki-layer',
    'source': 'syochiikiSource',
    'source-layer': "polygon",
    'type': 'fill',
    paint: {
        "fill-color": "rgba(0, 0, 0, 0)",
    },
}
const syochiikLayerLine = {
    id: "oh-syochiiki-line",
    type: "line",
    source: "syochiikiSource",
    "source-layer": "polygon",
    paint: {
        'line-color': 'red',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            1, 0.1,
            4, 0.2,
            6, 0.5,
            8, 0.7,
            11, 1.0,
            12, 1.5,
            14, 2,
            16, 3,
            18, 6,
            30, 10,
        ]
    },
}
const syochiikiLayerLabel = {
    id: "oh-syochiiki-label",
    type: "symbol",
    source: "syochiikiSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': [
            'format',
            ['get', 'S_NAME'],{},
            '\n', {},
            ['get', 'JINKO'], { 'font-scale': 1.2 },
            '人', {},
        ],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0.5, 0],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
const syochiikiLayerHeight = {
    id: 'oh-syochiiki-height',
    type: 'fill-extrusion',
    source: "syochiikiSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['/', ['get', 'JINKO'], ['get', 'AREA']],
            0, 100,
            0.2, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['/', ['get', 'JINKO'], ['get', 'AREA']],
            0, 'silver',
            0.1, 'black'
        ]
    }
}
// 高速道路--------------------------------------
export const highwaySource = {
    id: 'highwaySource', obj: {
        // 'type': 'geojson',
        // 'data': require('@/assets/json/highway_sections_2024.geojson'),
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kosoku/kosoku.pmtiles",

    }
}
export const highwayLayerGreen = {
    'id': 'oh-highwayLayer-green-lines',
    'type': 'line',
    'source': 'highwaySource',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': '#007356',
        'line-width': 5,
        'line-blur': 0.8,
        'line-opacity':1
    },
    'filter': ['<', 'N06_002', 2024]
}
export const highwayLayerRed = {
    'id': 'oh-highwayLayer-red-lines',
    'type': 'line',
    'source': 'highwaySource',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': '#FF0000',
        'line-width': 5,
        'line-blur': 0.8,
        'line-opacity':1
    },
    'filter': ['==', 'N06_002', 2024]
}
// バス--------------------------------------
const busSource = {
    id: 'bus-source', obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/bus/bus-h.pmtiles",
    }
}
const busteiSource = {
    id: 'bustei-source', obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/bus/bustei-h.pmtiles",
    }
}
const busLayer = {
    'id': 'oh-bus-lines',
    'type': 'line',
    'source': 'bus-source',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        // 'line-color': ['get', 'random_color'],
        'line-color': ['get', 'random_color_hash'],
        'line-blur': 0.8,
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1,
            11, 5
        ]
    }
}
const busteiLayer = {
    id: "oh-bus-points",
    type: "circle",
    source: "bustei-source",
    "source-layer": "point",
    'paint': {
        // 'circle-color': 'dodgerblue',
        'circle-color': ['get', 'random_color_hash'],
        // 'circle-color': [
        //     'match',
        //     ['slice', ['get', 'P11_004_01'], 0, 1], // 最初の1文字を取得
        //     '1', '#ff0000', // 最初の1文字が '"1' の場合の色 路線バス（民間）
        //     '2', '#00ff00', // 最初の1文字が '"2' の場合の色 路線バス（公営）
        //     '3', '#0000ff', // 最初の1文字が '"3' の場合の色 コミュニティバス
        //     '4', '#ffff00', // 最初の1文字が '"4' の場合の色
        //     '5', '#ff00ff', // 最初の1文字が '"5' の場合の色
        //     '#ffffff' // マッチしない場合のデフォルト色
        // ],
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 10
            // 6, 0.1,
            // 13, 10
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
}
const busteiLayerLabel = {
    id: "oh-bus-label",
    type: "symbol",
    source: "bustei-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'P11_001'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.5,
    },
    'maxzoom': 24,
    'minzoom': 13
}
// 鉄道--------------------------------------
const tetsudoSource = {
    id: 'tetsudo-source', obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tetsudo/tetsudojikeiretsu2.pmtiles",
    }
}
const tetsudoLayerRed = {
    'id': 'oh-tetsudo-red-lines',
    'type': 'line',
    'source': 'tetsudo-source',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': 'orangered',
        'line-blur': 0.8,
        // 'line-width': 5,
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 3,
            11, 5
        ]
    }
}
const tetsudoLayerBlue = {
    'id': 'oh-tetsudo-blue-lines',
    'type': 'line',
    'source': 'tetsudo-source',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': 'dodgerblue',
        'line-blur': 0.8,
        // 'line-width': 5,
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 3,
            11, 5
        ]
    },
    'filter': ['==', 'N05_005e', '9999']
}
const tetsudoLayerPointRed = {
    id: "oh-tetsudo-points-red",
    type: "circle",
    source: "tetsudo-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'orangered',
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 10
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
}
const tetsudoLayerPointBlue = {
    id: "oh-tetsudo-points-blue",
    type: "circle",
    source: "tetsudo-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'dodgerblue',
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 10
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
    'filter': ['==', 'N05_005e', '9999']
}
// 鉄道時系列--------------------------------------
const tetsudojikeiretsuSource = {
    id: 'tetsudojikeiretsu-source', obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tetsudo/tetsudojikeiretsu2.pmtiles",

    }
}
const tetsudojikeiretsuLayerPoint = {
    id: "oh-tetsudojikeiretsu-points",
    type: "circle",
    source: "tetsudojikeiretsu-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'white',  // 固定の赤色
        'circle-radius': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            12, 0,
            13, 10
        ],
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            13, 1
        ],
    },
    'filter':
        ['all',
            ['<=', ['number', ['to-number', ['get', 'N05_005b']]], 2024],
            ['>=', ['number', ['to-number', ['get', 'N05_005e']]], 2024]]
}
const tetsudojikeiretsuLayerBlue = {
    'id': 'oh-tetsudojikeiretsu-blue-lines',
    'type': 'line',
    'source': 'tetsudojikeiretsu-source',
    "source-layer": "line",
    'layout': {
        'line-join': 'round',
        'line-cap': 'round'
    },
    'paint': {
        'line-color': 'dodgerblue',
        'line-blur': 0.8,
        // 'line-width': 5,
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 3,
            11, 5
        ]
    },
    'filter':
        ['all',
            ['<=', ['number', ['to-number', ['get', 'N05_005b']]], 2024],
            ['>=', ['number', ['to-number', ['get', 'N05_005e']]], 2024]]
}
// export const tetsudojikeiretsuLayerRed = {
//     'id': 'oh-tetsudojikeiretsu-red-lines',
//     'type': 'line',
//     'source': 'tetsudojikeiretsu-source',
//     "source-layer": "line",
//     'layout': {
//         'line-join': 'round',
//         'line-cap': 'round'
//     },
//     'paint': {
//         'line-color': '#FF0000',
//         'line-width': 5,
//         'line-blur': 0.8,
//         'line-opacity':1
//     },
//     'filter': ['==', 'N06_002', 2024]
// }
// 標準地図--------------------------------------------------------------------------------------------------------------
export const stdSource = {
    id: 'stdSource', obj: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
    }
}
export const stdLayer = {
    'id': 'oh-stdLayer',
    'type': 'raster',
    'source': 'stdSource',
}
// 淡色地図--------------------------------------------------------------------------------------------------------------
export const paleSource = {
    id: 'pale-source', obj: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
    }
}
export const paleLayer = {
    'id': 'oh-pale-layer',
    'type': 'raster',
    'source': 'pale-source',
}
// 最新写真--------------------------------------------------------------------------------------------------------------
const seamlessphotoSource = {
    id:'seamlessphoto',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
        tileSize: 256
    }
}
const seamlessphotoLayer = {
    'id': 'oh-seamlessphoto',
    'source': seamlessphotoSource.id,
    'type': 'raster',
}
// 87写真--------------------------------------------------------------------------------------------------------------
const sp87Source = {
    id:'sp87-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo4/{z}/{x}/{y}.jpg'],
    }
}
const sp87Layer = {
    'id': 'oh-sp87',
    'source': 'sp87-source',
    'type': 'raster',
}
// 84写真--------------------------------------------------------------------------------------------------------------
const sp84Source = {
    id:'sp84-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo3/{z}/{x}/{y}.jpg'],
    }
}
const sp84Layer = {
    'id': 'oh-sp84',
    'source': 'sp84-source',
    'type': 'raster',
}
// 79写真--------------------------------------------------------------------------------------------------------------
const sp79Source = {
    id:'sp79-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo2/{z}/{x}/{y}.jpg'],
    }
}
const sp79Layer = {
    'id': 'oh-sp79',
    'source': 'sp79-source',
    'type': 'raster',
}
// 74写真--------------------------------------------------------------------------------------------------------------
const sp74Source = {
    id:'sp74-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo1/{z}/{x}/{y}.jpg'],
    }
}
const sp74Layer = {
    'id': 'oh-sp74',
    'source': 'sp74-source',
    'type': 'raster',
}
// 61写真--------------------------------------------------------------------------------------------------------------
const sp61Source = {
    id:'sp61-source',obj:{
        type: 'raster',
        tiles: ['https://maps.gsi.go.jp/xyz/ort_old10/{z}/{x}/{y}.png'],
    }
}
const sp61Layer = {
    'id': 'oh-sp61',
    'source': 'sp61-source',
    'type': 'raster',
}
// 45写真--------------------------------------------------------------------------------------------------------------
const sp45Source = {
    id:'sp45-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/ort_USA10/{z}/{x}/{y}.png'],
    }
}
const sp45Layer = {
    'id': 'oh-sp45',
    'source': 'sp45-source',
    'type': 'raster',
}
// 36写真--------------------------------------------------------------------------------------------------------------
const sp36Source = {
    id:'sp36-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/ort_riku10/{z}/{x}/{y}.png'],
    }
}
const sp36Layer = {
    'id': 'oh-sp36',
    'source': 'sp36-source',
    'type': 'raster',
}
// 28写真--------------------------------------------------------------------------------------------------------------
const sp28Source = {
    id:'sp28-source',obj:{
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/ort_1928/{z}/{x}/{y}.png'],
    }
}
const sp28Layer = {
    'id': 'oh-sp28',
    'source': 'sp28-source',
    'type': 'raster',
}
// 宮崎県航空写真--------------------------------------------------------------------------------------------------------------
const miyazakiSyashinSource = {
    id:'miyazaki-syashin-source',obj:{
        type: 'raster',
        tiles: ['https://mtile.pref.miyazaki.lg.jp/tile/ort/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const miyazakiSyashinLayer = {
    'id': 'oh-miyazaki-syashin',
    'source': 'miyazaki-syashin-source',
    'type': 'raster',
}
// 神奈川県航空写真--------------------------------------------------------------------------------------------------------------
const kanagawaSyashinSource = {
    id:'kanagawa-syashin-source',obj:{
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/kokusyashin/kanagawa2/{z}/{x}/{y}.png'],
    }
}
const kanagawaSyashinLayer = {
    'id': 'oh-kanagawa-syashin',
    'source': 'kanagawa-syashin-source',
    'type': 'raster',
}
// 横浜北部、川崎航空写真--------------------------------------------------------------------------------------------------------------
const yokohamaSyashinSource = {
    id:'yokohama-syashin-source',obj:{
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/kokusyashin/yokohama/{z}/{x}/{y}.png'],
    }
}
const yokohamaSyashinLayer = {
    'id': 'oh-yokohama-syashin',
    'source': 'yokohama-syashin-source',
    'type': 'raster',
}
// ---------------------------------------------------------------------------------------------------------------------
// PLATEAU建物（PMTiles）ソース
const plateauPmtilesSource = {
    id: "plateauPmtiles", obj:{
        type: "vector",
        // url: "pmtiles://https://shiworks.xsrv.jp/pmtiles-data/plateau/PLATEAU_2022_LOD1.pmtiles",
        url: "pmtiles://https://shiworks.xsrv.jp/pmtiles-data/plateau/PLATEAU_2023_LOD0.pmtiles",
        minzoom: 16,
        maxzoom: 16,
        attribution: '<a href="https://github.com/shiwaku/mlit-plateau-bldg-pmtiles">mlit-plateau-bldg-pmtiles</a>'
    }
}
const plateauPmtilesLayer = {
    'id': 'oh-plateauPmtiles',
    'source': 'plateauPmtiles',
    // 'source-layer': "PLATEAU",
    'source-layer': "PLATEAU_2023_LOD0",
    "minzoom": 14,
    "maxzoom": 23,
    'type': 'fill-extrusion',
    'paint': {
        "fill-extrusion-color": '#797979',
        "fill-extrusion-opacity": 1.0,
        // "fill-extrusion-height": ["get", "measuredHeight"]
        "fill-extrusion-height": ["get", "measured_height"]
    }
}
// 横浜北部、川崎CS立体図---------------------------------------------------------------------------------------------------------
const csYokohamSource = {
    id: 'cs-yokohama-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/cs/yokohama/{z}/{x}/{y}.png'],
    }
}
const csYokohamaLayer = {
    'id': 'oh-cs-yokohama-layer',
    'type': 'raster',
    'source': 'cs-yokohama-source',
}
// 神奈川県CS立体図---------------------------------------------------------------------------------------------------------
const csKanagawaSource = {
    id: 'cs-kanagawa-source', obj: {
        type: 'raster',
        tiles: ['https://shiworks.xsrv.jp/raster-tiles/pref-kanagawa/kanagawapc-cs-tiles/{z}/{x}/{y}.png'],
    }
}
const csKanagawaLayer = {
    'id': 'oh-cs-kanagawa-layer',
    'type': 'raster',
    'source': 'cs-kanagawa-source',
}
// 色別標高図---------------------------------------------------------------------------------------------------------
const shikibetsuSource = {
    id: 'shikibetsu-source', obj: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'],
    }
}
const shikibetsuLayer = {
    'id': 'oh-shikibetsu-layer',
    'type': 'raster',
    'source': 'shikibetsu-source'
}
// 陰影起伏図---------------------------------------------------------------------------------------------------------
const ineiSource = {
    id: 'inei-source', obj: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'],
    }
}
const ineiLayer = {
    'id': 'oh-inei-layer',
    'type': 'raster',
    'source': 'inei-source'
}
// 栃木県CS立体図---------------------------------------------------------------------------------------------------------
const csTochigiSource = {
    id: 'cs-tochigi', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://rinya-tochigi.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png'],
    }
}
const csTochigiLayer = {
    'id': 'oh-cs-tochigi-layer',
    'type': 'raster',
    'source': 'cs-tochigi'
}
// 長野県CS立体図---------------------------------------------------------------------------------------------------------
const csNaganoSource = {
    id: 'cs-nagano', obj: {
        type: 'raster',
        tiles: ['https://tile.geospatial.jp/CS/VER2/{z}/{x}/{y}.png'],
    }
}
const csNaganoLayer = {
    'id': 'oh-cs-nagano-layer',
    'type': 'raster',
    'source': 'cs-nagano'
}
// 広島県CS立体図shi-works氏-CS 1m---------------------------------------------------------------------------------------------------------
const csHiroshimaSource = {
    id: 'cs-hiroshima', obj: {
        type: 'raster',
        tiles: ['https://xs489works.xsrv.jp/raster-tiles/pref-hiroshima/hiroshimapc-cs-tiles/{z}/{x}/{y}.png'],
    }
}
const csHiroshimaLayer = {
    'id': 'oh-cs-hiroshima-layer',
    'type': 'raster',
    'source': 'cs-hiroshima'
}
// 岡山県CS立体図---------------------------------------------------------------------------------------------------------
const csOkayamaSource = {
    id: 'cs-okayama', obj: {
        type: 'raster',
        tiles: ['https://www2.ffpri.go.jp/soilmap/tile/cs_okayama/{z}/{x}/{y}.png'],
    }
}
const csOkayamaLayer = {
    'id': 'oh-cs-okayama-layer',
    'type': 'raster',
    'source': 'cs-okayama'
}
// 福島県CS立体図---------------------------------------------------------------------------------------------------------
const csFukushimaSource = {
    id: 'cs-fukushima', obj: {
        type: 'raster',
        tiles: ['https://www2.ffpri.go.jp/soilmap/tile/cs_fukushima/{z}/{x}/{y}.png'],
    }
}
const csFukushimaLayer = {
    'id': 'oh-cs-fukushima-layer',
    'type': 'raster',
    'source': 'cs-fukushima'
}
// 愛媛県CS立体図---------------------------------------------------------------------------------------------------------
const csEhimeSource = {
    id: 'cs-ehime-source', obj: {
        type: 'raster',
        tiles: ['https://www2.ffpri.go.jp/soilmap/tile/cs_ehime/{z}/{x}/{y}.png'],
    }
}
const csEhimeLayer = {
    'id': 'oh-cs-ehime-layer',
    'type': 'raster',
    'source': 'cs-ehime-source'
}
// 高知県CS立体図---------------------------------------------------------------------------------------------------------
const csKochiSource = {
    id: 'cs-kochi-source', obj: {
        type: 'raster',
        tiles: ['https://rinya-kochi.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png'],
    }
}
const csKochiLayer = {
    'id': 'oh-cs-kochi-layer',
    'type': 'raster',
    'source': 'cs-kochi-source'
}
// 熊本県・大分県CS立体図---------------------------------------------------------------------------------------------------------
const csKumamotoSource = {
    id: 'cs-kumamoto-source', obj: {
        type: 'raster',
        tiles: ['https://www2.ffpri.go.jp/soilmap/tile/cs_kumamoto_oita/{z}/{x}/{y}.png'],
    }
}
const csKumamotoLayer = {
    'id': 'oh-cs-kumamoto-layer',
    'type': 'raster',
    'source': 'cs-kumamoto-source'
}
// 岐阜県CS立体図---------------------------------------------------------------------------------------------------------
const csGifuSource = {
    id: 'csGifu', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://kenzkenz2.xsrv.jp/gihucs/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const csGifuLayer = {
    'id': 'oh-csGifuLayer',
    'type': 'raster',
    'source': 'csGifu'
}
// 能登CS立体図------------------------------------------------------------------------------------------------------
const csNotoSource = {
    id: 'csNotoSource', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://www2.ffpri.go.jp/soilmap/tile/cs_noto/{z}/{x}/{y}.png'],
        tileSize: 256,
    }
}
const csNotoLayer = {
    'id': 'oh-csNotoLayer',
    'type': 'raster',
    'source': 'csNotoSource',
    // paint: {
    //     "raster-resampling": "nearest" // ぼやけを防ぐために「nearest」を使用
    // }
}
// 静岡県県CS立体図------------------------------------------------------------------------------------------------------
const csShizuokaSource = {
    id: 'csShizuokaSource', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://kenzkenz3.xsrv.jp/cs/shizuoka/{z}/{x}/{y}.png'],
        tileSize: 256,
    }
}
const csShizuokaLayer = {
    'id': 'oh-csShizuokaLayer',
    'type': 'raster',
    'source': 'csShizuokaSource',
}
// 兵庫県CS立体図------------------------------------------------------------------------------------------------------
const csHyogoSource = {
    id: 'cs-hiyogo-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://rinya-hyogo.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png'],
        tileSize: 256,
    }
}
const csHyogoLayer = {
    'id': 'oh-csHyogoLayer',
    'type': 'raster',
    'source': 'cs-hiyogo-source',
}
// 愛知県赤色立体図------------------------------------------------------------------------------------------------------
const aichiSekisyokuSource = {
    id: 'aichiSekisyokuSource', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://bg.maps.pref.aichi.jp/tiles/w213665/{z}/{x}/{y}.png'],
        tileSize: 256,
        crossOrigin: 'anonymous',
    }
}
const aichiSekisyokuLayer = {
    'id': 'oh-aichiSekisyokuLayer',
    'type': 'raster',
    'source': 'aichiSekisyokuSource',
}
// 神奈川県赤色立体図------------------------------------------------------------------------------------------------------
const kanagawaSekisyokuSource = {
    id: 'kanagawa-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/sekisyoku/kanagawa/{z}/{x}/{y}.png'],
    }
}
const kanagawaSekisyokuLayer = {
    'id': 'oh-kanagawa-sekisyoku-layer',
    'type': 'raster',
    'source': 'kanagawa-sekisyoku-source',
}
// 多摩地域赤色立体地図------------------------------------------------------------------------------------------------------
const tamaSekisyokuSource = {
    id: 'tamaSekisyokuSource', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tamasekisyoku/{z}/{x}/{y}.png'],
        tileSize: 256,
        scheme: 'tms',
    }
}
const tamaSekisyokuLayer = {
    'id': 'oh-tamaSekisyokuLayer',
    'type': 'raster',
    'source': 'tamaSekisyokuSource',
}
// 東京都23区赤色立体地図------------------------------------------------------------------------------------------------------
const tokyo23SekisyokuSource = {
    id: 'tokyo23-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/sekisyoku/tokyo/{z}/{x}/{y}.png'],
    }
}
const tokyo23SekisyokuLayer = {
    'id': 'oh-tokyo23-sekisyoku-layer',
    'type': 'raster',
    'source': 'tokyo23-sekisyoku-source',
}
// 東京都島しょ地域赤色立体地図------------------------------------------------------------------------------------------------------
const tosyo01SekisyokuSource = {
    id: 'tosyo01-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku01/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const tosyo01SekisyokuLayer = {
    'id': 'oh-tosyo01-sekisyoku-layer',
    'type': 'raster',
    'source': 'tosyo01-sekisyoku-source',
}
const tosyo02SekisyokuSource = {
    id: 'tosyo02-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku02/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const tosyo02SekisyokuLayer = {
    'id': 'oh-tosyo02-sekisyoku-layer',
    'type': 'raster',
    'source': 'tosyo02-sekisyoku-source',
}
const tosyo03SekisyokuSource = {
    id: 'tosyo03-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku03/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const tosyo03SekisyokuLayer = {
    'id': 'oh-tosyo03-sekisyoku-layer',
    'type': 'raster',
    'source': 'tosyo03-sekisyoku-source',
    'raster-resampling': 'nearest'
}
const tosyo04SekisyokuSource = {
    id: 'tosyo04-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku04/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const tosyo04SekisyokuLayer = {
    'id': 'oh-tosyo04-sekisyoku-layer',
    'type': 'raster',
    'source': 'tosyo04-sekisyoku-source',
}
const tosyo05SekisyokuSource = {
    id: 'tosyo05-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku05/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const tosyo05SekisyokuLayer = {
    'id': 'oh-tosyo05-sekisyoku-layer',
    'type': 'raster',
    'source': 'tosyo05-sekisyoku-source',
}
const tosyo06SekisyokuSource = {
    id: 'tosyo06-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz2.xsrv.jp/tokyo/tousyosekisyoku06/{z}/{x}/{y}.png'],
        scheme: 'tms'
    }
}
const tosyo06SekisyokuLayer = {
    'id': 'oh-tosyo06-sekisyoku-layer',
    'type': 'raster',
    'source': 'tosyo06-sekisyoku-source',
}
// 高知県赤色立体地図------------------------------------------------------------------------------------------------------
const kochiSekisyokuSource = {
    id: 'kochi-sekisyoku-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz3.xsrv.jp/sekisyoku/kochi/{z}/{x}/{y}.png'],
    }
}
const kochiSekisyokuLayer = {
    'id': 'oh-kochi-sekisyoku-layer',
    'type': 'raster',
    'source': 'kochi-sekisyoku-source',
}
// 東京都23区CS立体図------------------------------------------------------------------------------------------------------
const tokyo23CsSource = {
    id: 'tokyo23-cs-source', obj: {
        type: 'raster',
        tiles: ['https://shiworks.xsrv.jp/raster-tiles/tokyo-digitaltwin/tokyopc-23ku-2024-cs-tiles/{z}/{x}/{y}.png'],
    }
}
const tokyo23CsLayer = {
    'id': 'oh-tokyo23-cs-layer',
    'type': 'raster',
    'source': 'tokyo23-cs-source',
}
// 大阪府CS立体地図------------------------------------------------------------------------------------------------------
const csOsakaSource = {
    id: 'csOsakaSource', obj: {
        type: 'raster',
        tiles: ['https://xs489works.xsrv.jp/raster-tiles/pref-osaka/osaka-cs-tiles/{z}/{x}/{y}.png'],
        tileSize: 256,
        crossOrigin: 'anonymous',
    }
}
const csOsakaLayer = {
    'id': 'oh-csOsakaLayer',
    'type': 'raster',
    'source': 'csOsakaSource',
}
// 川だけ地形地図------------------------------------------------------------------------------------------------------
export const kawadakeSource = {
    id: 'kawadake-source', obj: {
        type: 'raster',
        // tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://www.gridscapes.net/AllRivers/1.0.0/t/{z}/{x}/{y}.png'],
        tiles: ['https://kenzkenz.xsrv.jp/kawadake/{z}/{x}/{y}.png'],
        tileSize: 256,
        // scheme: 'tms',
        'maxzoom': 14,
        'minzoom': 5
    }
}
export const kawddakeLayer = {
    'id': 'oh-kawadakeLayer',
    'type': 'raster',
    'source': 'kawadake-source',
}
// 川と流域地図------------------------------------------------------------------------------------------------------
export const ryuikiSource = {
    id: 'ryuiki-source', obj: {
        type: 'raster',
        tiles: ['https://kenzkenz.xsrv.jp/open-hinata3/php/proxy.php?url=https://tiles.dammaps.jp/ryuiki_t/1/{z}/{x}/{y}.png'],
        tileSize: 256,
        crossOrigin: 'anonymous',
        minzoom: 5,
        maxzoom: 14
    }
}
export const ryuikiLayer = {
    'id': 'oh-ryuikiLayer',
    'type': 'raster',
    'source': 'ryuiki-source',
}
// 登記所備付地図データ --------------------------------------------------------------------------------------------
export const amxSource = {
    id: "amx-a-pmtiles", obj: {
        type: "vector",
        minzoom: 2,
        maxzoom: 16,
        url: "pmtiles://https://habs.rad.naro.go.jp/spatial_data/amx/a.pmtiles",
        // url: 'https://data.source.coop/smartmaps/amx-2024-04/MojMap_amx_2024.pmtiles',
        attribution: "<a href='https://www.moj.go.jp/MINJI/minji05_00494.html' target='_blank'>登記所備付地図データ（法務省）</a>",
    }
}
// 登記所備付地図データ 間引きなし
const amxLayer = {
    id: "oh-amx-a-fude",
    type: "fill",
    source: "amx-a-pmtiles",
    "source-layer": "fude",
    paint: {
        "fill-color": "rgba(254, 217, 192, 0)",
        "fill-outline-color": "rgba(255, 0, 0, 1)",
    },
}
const amxLayerLine = {
    id: "oh-amx-a-fude-line",
    type: "line",
    source: "amx-a-pmtiles",
    "source-layer": "fude",
    paint: {
        "line-color": "red",
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0.5,
            20, 6
        ]
    },
}
// 登記所備付地図データ 代表点レイヤ
const amxLayerDaihyou = {
    id: "oh-amx-a-daihyo",
    // ヒートマップ
    type: "heatmap",
    source: "amx-a-pmtiles",
    // ベクトルタイルソースから使用するレイヤ
    "source-layer": "daihyo",
    paint: {
        // ヒートマップの密度に基づいて各ピクセルの色を定義
        "heatmap-color": [
            // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            "interpolate",
            // 入力より小さいストップと大きいストップのペアを直線的に補間
            ["linear"],
            // ヒートマップレイヤーの密度推定値を取得
            ["heatmap-density"],
            0,
            "rgba(255, 255, 255, 0)",
            0.5,
            "rgba(255, 255, 0, 0.5)",
            // 1に近づくほど密度が高い
            1,
            "rgba(255, 0, 0, 0.5)",
        ],
        // ヒートマップ1点の半径（ピクセル単位）
        "heatmap-radius": [
            // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            "interpolate",
            // 出力が増加する割合を制御する、1に近づくほど出力が増加する
            ["exponential", 10],
            // ズームレベルに応じて半径を調整する
            ["zoom"],
            2,
            5,
            14,
            50,
        ],
    }
}
const amxLayerLabel = {
    id: "oh-amx-label",
    type: "symbol",
    source: "amx-a-pmtiles",
    "source-layer": "fude",
    'layout': {
        'text-field': ['get', '地番'],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'rgba(255, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 17
}
// 幕末近世 --------------------------------------------------------------------------------------------
const bakumatsuSource = {
    id: "bakumatsu", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/bakumatsu/b410.pmtiles",
    }
}
const bakumatsuLayer = {
    id: "oh-bakumatsu-layer",
    type: "fill",
    source: "bakumatsu",
    "source-layer": "b41",
    paint: {
        'fill-color': ['get', 'random_color_ryobun'],
    }
}
const bakumatsuLayerHeight = {
    id: 'oh-bakumatsu-kokudaka-height',
    type: 'fill-extrusion',
    source: "bakumatsu",
    "source-layer": "b41",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['/', ['get', '石高計'], ['get', 'area']],
            0, 100,
            50000000, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['/', ['get', '石高計'], ['get', 'area']],
            0, 'white',
            10000000, 'red',
            50000000, 'black'
        ]
    }
}
const bakumatsuLayerLine = {
    id: "oh-bakumatsu-line",
    type: "line",
    source: "bakumatsu",
    "source-layer": "b41",
    paint: {
        'line-color': '#000',
        // 'line-width': 0.5
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
const bakumatsuLayerLabel = {
    id: "oh-bakumatsu-label",
    type: "symbol",
    source: "bakumatsu",
    "source-layer": "b41",
    'layout': {
        'text-field': [
            'let', 'splitIndex', ['index-of', '・', ['get', '村名']],
            [
                'case',
                ['>=', ['var', 'splitIndex'], 0],
                ['slice', ['get', '村名'], 0, ['var', 'splitIndex']],
                ['get', '村名']
            ]
        ],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0.5, 0],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
// 幕末近世ポイント --------------------------------------------------------------------------------------------
const bakumatsuPointSource = {
    id: "bakumatsu-point-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/bakumatsupoint/bp.pmtiles",
    }
}
const bakumatsuPointLayer = {
    id: "oh-bakumatsu-point",
    type: "circle",
    source: "bakumatsu-point-source",
    "source-layer": "bp",
    'paint': {
        'circle-color': ['get','random_color_ryobun'],
        'circle-radius': [
            'interpolate',
            ['linear'],
            ['sqrt', ['get', '石高計']],
            0, 1,
            200, 40
        ],
    }
}
// 小学校-------------------------------------------------------------------------------------------
const syogakkoR05Source = {
    id: "syogakkoR05Source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/syogakko/r05/s4joint.pmtiles",
    }
}
const syogakkoR05Layer = {
    id: "oh-syogakkoR05",
    type: "fill",
    source: "syogakkoR05Source",
    "source-layer": "s4polygon",
    paint: {
        'fill-color': ['get', 'random_color']
    }

}
const syogakkoR05LayerLine = {
    id: "oh-syogakkoR05-line",
    type: "line",
    source: "syogakkoR05Source",
    "source-layer": "s4polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
const syogakkoR05LayerLabel = {
    id: "oh-syogakkoR05-label",
    type: "symbol",
    source: "syogakkoR05Source",
    "source-layer": "s4point",
    'layout': {
        'text-field': ['get', 'P29_004'],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
const syogakkoR05LayerPoint = {
    id: "oh-syogakkoR05-point",
    type: "circle",
    source: "syogakkoR05Source",
    "source-layer": "s4point",
    'paint': {
        'circle-color': '#000',  // 固定の赤色
        'circle-radius': 6  // 半径を設定
    }
}
// 中学校ソース --------------------------------------------------------------------------------------------
export const cyugakuR05Source = {
    id: "cyugakuR05Source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/cyugakko/r05/t4joint.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
// 中学校レイヤー
export const cyugakuR05Layer = {
    id: "oh-cyugakuR05",
    type: "fill",
    source: "cyugakuR05Source",
    "source-layer": "t4polygon",
    paint: {
        'fill-color': ['get', 'random_color']
    }
}
export const cyugakuR05LayerLine = {
    id: "oh-cyugakuR05-line",
    type: "line",
    source: "cyugakuR05Source",
    "source-layer": "t4polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
export const cyugakuR05LayerLabel = {
    id: "oh-cyugakuR05-label",
    type: "symbol",
    source: "cyugakuR05Source",
    "source-layer": "t4point",
    'layout': {
        'text-field': ['get', 'P29_004'],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
export const cyugakuR05LayerPoint = {
    id: "oh-cyugakuR05-point",
    type: "circle",
    source: "cyugakuR05Source",
    "source-layer": "t4point",
    'paint': {
        'circle-color': '#000',
        'circle-radius': 6
    }
}
// 地形分類タイルソース --------------------------------------------------------------------------------------------
export const chikeibunruiSource = {
    id: "chikeibunruiSource", obj: {
        type: "vector",
        tiles: ["https://optgeo.github.io/unite-one/zxy/{z}/{x}/{y}.pbf"],
        attribution: "国土地理院ベクトルタイル提供実験",
        minzoom: 10,
        maxzoom: 12
    }
}
export const chikeibunruiLayer = {
    id: "oh-chikeibunrui",
    type: "fill",
    source: "chikeibunruiSource",
    "source-layer": "one",
    "paint": {
        "fill-color": [
            "match",
            [
                "get",
                "code"
            ],
            "山地",
            "#d9cbae",
            "崖・段丘崖",
            "#9466ab",
            "地すべり地形",
            "#cc99ff",
            "台地・段丘",
            "#ffaa00",
            "山麓堆積地形",
            "#99804d",
            "扇状地",
            "#cacc60",
            "自然堤防",
            "#ffff33",
            "天井川",
            "#fbe09d",
            "砂州・砂丘",
            "#ffff99",
            "凹地・浅い谷",
            "#a3cc7e",
            "氾濫平野",
            "#bbff99",
            "後背低地・湿地",
            "#00d1a4",
            "旧河道",
            "#6699ff",
            "落堀",
            "#1f9999",
            "河川敷・浜",
            "#9f9fc4",
            "水部",
            "#e5ffff",
            "旧水部",
            "#779999",
            "#f00"
        ]
    },
}
// 日本歴史地名大系ソース --------------------------------------------------------------------------------------------
export const nihonrekishiSource = {
    id: "nihonrekishiSouce", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/chimei/c.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
// 日本歴史地名大系レイヤー
export const nihonrekishiLayer = {
    id: "oh-nihonrekishi",
    type: "circle",
    source: "nihonrekishiSouce",
    "source-layer": "point",
    'paint': {
        'circle-color': 'red',
        'circle-radius': 6
    }
}
export const nihonrekishiLayerLabel = {
    id: "oh-nihonrekishi-label",
    type: "symbol",
    source: "nihonrekishiSouce",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', '名称'],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
// ---------------------------------------------------------------------------------------------------------------------
export const iryokikanSource = {
    id: "iryokikanSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/iryo/i.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
//
export const iryokikanLayer = {
    id: "oh-iryokikan",
    type: "circle",
    source: "iryokikanSource",
    "source-layer": "i",
    'paint': {
        'circle-color': [
            'match',
            ['get', 'P04_001'],
            1, 'red',
            2, 'green',
            3, 'blue',
            'black'
        ],
        'circle-radius': 6
    }
}
export const iryokikanLayerLabel = {
    id: "oh-iryokikan-label",
    type: "symbol",
    source: "iryokikanSource",
    "source-layer": "i",
    'layout': {
        'text-field': ['get', 'P04_002'],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0, 2],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 12
}
// 100mメッシュソース --------------------------------------------------------------------------------------------
const m100mSource = {
    id: "m100mSource", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/100m/100m.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const m100mLayer = {
    id: "oh-m100m",
    type: "fill",
    source: "m100mSource",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'PopT'],
            0, 'rgba(255,255,255,0.8)',   // Color for low values
            500, 'rgba(255,0,0,0.8)', // Intermediate value
            1400, 'rgba(0,0,0,0.8)' // Color for high values
        ],
        'fill-opacity': 1
    }
}
const m100mLayerLine = {
    id: "oh-m100m-line",
    type: "line",
    source: "m100mSource",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
const m100mLayerLabel = {
    id: "oh-m100m-label",
    type: "symbol",
    source: "m100mSource",
    "source-layer": "polygon",
    'layout': {
        "text-field": [
            "to-string", ["round", ["get", "PopT"]]
        ],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 0],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 15
}
const m100mLayerHeight = {
    id: 'oh-m100m-height',
    type: 'fill-extrusion',
    source: "m100mSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 100,
            1400, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            500, 'red',
            1400, 'black'
        ]
    }
}
// 250mメッシュソース --------------------------------------------------------------------------------------------
export const m250mSource = {
    id: "m250mSource", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/250m/250m.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const m250mLayer = {
    id: "oh-m250m",
    type: "fill",
    source: "m250mSource",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            1000, 'red',
            3000, 'black'
        ]
    }
}
export const m250mLayerLine = {
    id: "oh-m250m-line",
    type: "line",
    source: "m250mSource",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
export const m250mLayerLabel = {
    id: "oh-m250m-label",
    type: "symbol",
    source: "m250mSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'jinko'],
        'text-font': ['NotoSansJP-Regular'],
        // 'text-anchor': 'left',
        'text-offset': [0, 0],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 13
}
export const m250mLayerHeight = {
    id: 'oh-m250m-height',
    type: 'fill-extrusion',
    source: "m250mSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 100,
            3000, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            1000, 'red',
            3000, 'black'
        ]
    }
}
// 500mメッシュソース --------------------------------------------------------------------------------------------
export const m500mSource = {
    id: "m500mSource", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/500m/500m2.pmtiles",
    }
}
export const m500mLayer = {
    id: "oh-m500m",
    type: "fill",
    source: "m500mSource",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            5000, 'red',
            17500, 'black'
        ]
    }
}
export const m500mLayerLine = {
    id: "oh-m500m-line",
    type: "line",
    source: "m500mSource",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
export const m500mLayerLabel = {
    id: "oh-m500m-label",
    type: "symbol",
    source: "m500mSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'jinko'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 0],
        'text-anchor': 'center',
        'text-allow-overlap': false, // 重複を許可しない
        'text-ignore-placement': false, // 配置を尊重
        'symbol-placement': 'point', // ポイントごとに1つのラベルを表示
        'text-padding': 10 // ラベル同士の間隔を調整
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'minzoom': 12
}
export const m500mLayerHeight = {
    id: 'oh-m500m-height',
    type: 'fill-extrusion',
    source: "m500mSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 100,
            17500, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            5000, 'red',
            17500, 'black'
        ]
    }
}
// 1kmメッシュソース --------------------------------------------------------------------------------------------
export const m1kmSource = {
    id: "m1kmSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/mesh/1km/1km2.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const m1kmLayer = {
    id: "oh-m1km",
    type: "fill",
    source: "m1kmSource",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            10000, 'red',
            35000, 'black'
        ]
    }
}
export const m1kmLayerLine = {
    id: "oh-m1km-line",
    type: "line",
    source: "m1kmSource",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            11, 0,
            12, 0.5
        ]
    },
}
export const m1kmLayerLabel = {
    id: "oh-m1km-label",
    type: "symbol",
    source: "m1kmSource",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'jinko'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 0],
        'text-anchor': 'center',
        'text-allow-overlap': false, // 重複を許可しない
        'text-ignore-placement': false, // 配置を尊重
        'symbol-placement': 'point', // ポイントごとに1つのラベルを表示
        'text-padding': 10 // ラベル同士の間隔を調整
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'minzoom': 12
}
export const m1kmLayerHeight = {
    id: 'oh-m1km-height',
    type: 'fill-extrusion',
    source: "m1kmSource",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 100,
            35000, 10000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'jinko']],
            0, 'white',
            10000, 'red',
            35000, 'black'
        ]
    }
}
// ---------------------------------------------------------------------------------------------------------------------
// 全国旧石器
export const kyusekkiSource = {
    id: "kyusekkiSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kyusekki/kyusekki.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
//
export const kyusekkiLayer = {
    id: "oh-kyusekki",
    type: "circle",
    source: "kyusekkiSource",
    "source-layer": "point",
    "minzoom":12,
    'paint': {
        'circle-color': '#3cb371',
        'circle-radius': 8,
    }
}
export const kyusekkiLayerHeatmap = {
    id: "oh-kyusekki-heatmap",
    type: "heatmap",
    source: "kyusekkiSource",
    "source-layer": "point",
    "maxzoom":12,
    paint: {
        // ヒートマップの密度に基づいて各ピクセルの色を定義
        "heatmap-color": [
            // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            "interpolate",
            // 入力より小さいストップと大きいストップのペアを直線的に補間
            ["linear"],
            // ヒートマップレイヤーの密度推定値を取得
            ["heatmap-density"],
            0,
            "rgba(255, 255, 255, 0)",
            0.5,
            "rgba(60, 179, 113, 0.6)",
            // 1に近づくほど密度が高い
            1,
            "rgba(255, 215, 0, 0.8)",
        ],
        // ヒートマップ1点の半径（ピクセル単位）
        "heatmap-radius": [
            // 入力値と出力値のペア（"stop"）の間を補間することにより、連続的で滑らかな結果を生成する
            "interpolate",
            // 出力が増加する割合を制御する、1に近づくほど出力が増加する
            ["exponential", 10],
            // ズームレベルに応じて半径を調整する
            ["zoom"],
            2,
            20,
            5,
            20,
            14,
            20,
            50,
            20
        ],
    }
}
// 河川ソース --------------------------------------------------------------------------------------------
export const kasenSource = {
    id: "kasenSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kasen/kasen.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const kasenLayer = {
    id: "oh-kasen",
    type: "line",
    source: "kasenSource",
    "source-layer": "line",
    paint: {
        'line-color': 'blue',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            1, 0.1,
            4, 0.2,
            6, 0.5,
            8, 0.7,
            11, 1.0,
            12, 1.5,
            14, 2,
            16, 3,
            18, 6,
            30, 10,
        ]
    },
}
export const kasenLayerLabel = {
    id: "oh-kasen-label",
    type: "symbol",
    source: "kasenSource",
    "source-layer": "line",
    'layout': {
        'text-field': ['get', 'W05_004'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 0],
        'text-anchor': 'center',
        'text-allow-overlap': false, // 重複を許可しない
        'text-ignore-placement': false, // 配置を尊重
        'symbol-placement': 'point', // ポイントごとに1つのラベルを表示
        'text-padding': 10 // ラベル同士の間隔を調整
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'minzoom': 12
}
// ---------------------------------------------------------------------------------------------------------------------
// 災害伝承碑
export const densyohiSource = {
    id: "densyohiSource", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/densyohi/densyohi.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
//
export const densyohiLayer = {
    id: "oh-densyohi",
    type: "circle",
    source: "densyohiSource",
    "source-layer": "point",
    'paint': {
        'circle-color': '#3cb371',
        'circle-radius': 8,
    }
}
export const densyohiLayer2 = {
    id: "oh-densyohi",
    type: "symbol",
    source: "densyohiSource",
    "source-layer": "point",
    "layout": {
        "icon-image": "densyouhi",  // JSONに記述されたアイコン名を指定
        "icon-size": 1.0
    }
}
// did------------------------------------------------------------------------------------------------------------------
export const didSource = {
    id: "did-source", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/did/did.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const didLayer = {
    id: "oh-did",
    type: "fill",
    source: "did-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': 'gray'
    }
}
export const didLayerLine = {
    id: "oh-did_line",
    type: "line",
    source: "did-source",
    "source-layer": "4polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
// 選挙区----------------------------------------------------------------------------------------------------------------
export const senkyokuSource = {
    id: "senkyoku-source", obj: {
        type: "vector",
        // minzoom: 0,
        // maxzoom: 15,
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/senkyoku/senkyoku2022.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
export const senkyokuLayer = {
    id: "oh-senkyoku",
    type: "fill",
    source: "senkyoku-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': 'gray'
    }
}
export const senkyokuLayerLine = {
    id: "oh-senkyoku_line",
    type: "line",
    source: "senkyoku-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0.5,
            11, 1
        ]
    },
}
export const senkyokuLayerLabel = {
    id: "oh-senkyoku-label",
    type: "symbol",
    source: "senkyoku-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'kuname'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 2],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
// 公示価格--------------------------------------------------------------------------------------------------------------
const kojiSource = {
    id: "koji-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kojikakaku/kojikakaku2.pmtiles",
        attribution:
            "<a href='' target='_blank'></a>",
    }
}
const kojiLayerLabel = {
    id: "oh-koji-label",
    type: "symbol",
    source: "koji-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'L01_025'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 2],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 12
}
const kojiLayerPoint = {
    id: "oh-koji_point",
    type: "circle",
    source: "koji-source",
    "source-layer": "point",
    'paint': {
        'circle-color': [
            'interpolate',
            ['linear'],
            ["to-number",['get', 'L01_008']],
            0, 'white',
            500000, 'red',
            50000000, 'black'
        ],
        'circle-stroke-color': 'black',
        'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 0,
            10, 1
        ],
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 8
        ]
    }
}
const kojilayerheight = {
    id: 'oh-koji-height',
    type: 'fill-extrusion',
    source: "koji-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['^', ["to-number",['get', 'L01_008']],0.8],
            0, 100,
            4000000, 100000
        ],
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['^', ["to-number",['get', 'L01_008']],0.8],
            0, 'white',
            50000, 'red',
            4000000, 'black'
        ]
    }
}
// 神社 --------------------------------------------------------------------------------------------
const jinjyaSource = {
    id: "jinjya-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/jinjya/jinjya.pmtiles",
    }
}
const jinjyaLayer = {
    id: "oh-jinjya-layer",
    type: "circle",
    source: "jinjya-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'navy',
        'circle-radius':[
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            2, 1,
            4, 3,
            7, 6,
            11, 10
        ]
    }
}
const jinjyaLayerLabel = {
    id: "oh-jinjya-label",
    type: "symbol",
    source: "jinjya-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'name'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 9
}
// 道の駅 --------------------------------------------------------------------------------------------
const michinoekiSource = {
    id: "michinoeki-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/michinoeki/michinoeki.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const michinoekiLayer = {
    id: "oh-michinoeki",
    type: "circle",
    source: "michinoeki-source",
    "source-layer": "michinoeki",
    'paint': {
        'circle-color': 'navy',
        'circle-radius':[
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            2, 1,
            4, 3,
            7, 6,
            11, 10
            ]
    }
}
const michinoekiLayerLabel = {
    id: "oh-michinoeki-label",
    type: "symbol",
    source: "michinoeki-source",
    "source-layer": "michinoeki",
    'layout': {
        'text-field': ['get', 'P35_006'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 9
}
// 東京地震----------------------------------------------------------------------------------------------------------------
const tokyojishinSource = {
    id: "tokyojishin-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tokyojishin/tokyojishin.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const tokyojishinLayerSogo = {
    id: "oh-tokyojishin",
    type: "fill",
    source: "tokyojishin-source",
    "source-layer": "polygon",
    'paint': {
        'fill-color': [
            'match',
            ['get', '総合_ラ'],
            1, 'rgb(162,209,229,0.8)',
            2, 'rgb(125,170,118,0.8)',
            3, 'rgb(206,135,52,0.8)',
            4, 'rgb(213,64,43,0.8)',
            5, 'rgb(79,19,19,0.8)',
            'red' // Default color (if no match)
        ],
    },
}
export const tokyojishinLayer = {
    id: "oh-tokyojishin",
    type: "fill",
    source: "tokyojishin-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': 'gray'
    }
}
const tokyojishinLayerLine = {
    id: "oh-tokyojishin_line",
    type: "line",
    source: "tokyojishin-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0.5,
            11, 1
        ]
    },
}
const tokyojishinLayerLabel = {
    id: "oh-tokyojishin-label",
    type: "symbol",
    source: "tokyojishin-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', '町丁目名'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 2],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 16
}
// export const tokyojishinheight = {
//     id: 'oh-tokyojishin-height',
//     type: 'fill-extrusion',
//     source: "tokyojishin-source",
//     "source-layer": "polygon",
//     paint: {
//         'fill-extrusion-height': [
//             'interpolate',
//             ['linear'],
//             ["to-number",['get', '総合_順']],
//             0, 10,
//             6000, 3000
//         ],
//         'fill-extrusion-color': [
//             'interpolate',
//             ['linear'],
//             ["to-number",['get', '総合_順']],
//             0, 'white',
//             4000, 'red',
//             6000, 'black'
//         ]
//     }
// }
const tokyojishinheightSogo = {
    id: 'oh-tokyojishin-height',
    type: 'fill-extrusion',
    source: "tokyojishin-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-height': [
            'match',
            ['get', '総合_ラ'],
            1, 100,
            2, 500,
            3, 1500,
            4, 2000,
            5, 2500,
            0 // Default color (if no match)
        ],
        'fill-extrusion-color': [
            'match',
            ['get', '総合_ラ'],
            1, 'rgb(162,209,229,0.8)',
            2, 'rgb(125,170,118,0.8)',
            3, 'rgb(206,135,52,0.8)',
            4, 'rgb(213,64,43,0.8)',
            5, 'rgb(79,19,19,0.8)',
            'red'
        ]
    }
}
// ハザードマップ等--------------------------------------------------------------------------------------------------------
// 避難所洪水 --------------------------------------------------------------------------------------------
const hinanjyoKozuiSource = {
    id: "hinanjyo-kozui-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/hinanjyo/hinanjyo-kozui.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const hinanjyoKozuiLayer = {
    id: "oh-hinanjyo-kozui",
    type: "circle",
    source: "hinanjyo-kozui-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'steelblue',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 10
        ]
    }
}
const hinanjyoKozuiLayerLabel = {
    id: "oh-hinanjyo-kozui-label",
    type: "symbol",
    source: "hinanjyo-kozui-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'name'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 13
}
// 避難所土石流 --------------------------------------------------------------------------------------------
const hinanjyoDosekiryuSource = {
    id: "hinanjyo-dosekiryu-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/hinanjyo/hinanjyo-dosekiryu.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const hinanjyoDosekiryuLayer = {
    id: "oh-hinanjyo-dosekiryu",
    type: "circle",
    source: "hinanjyo-dosekiryu-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'tomato',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 10
        ]
    }
}
const hinanjyoDosekiryuLayerLabel = {
    id: "oh-hinanjyo-dosekiryu-label",
    type: "symbol",
    source: "hinanjyo-dosekiryu-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'name'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(0, 0, 0, 1)',
        'text-halo-color': 'rgba(255,255,255,1)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 13
}
// R05大規模盛土造成地-----------------------------------------------------------------------------------------------------
const zoseiSource = {
    id: "zosei-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/zosei/zosei.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const zoseiLayer = {
    id: "oh-zosei",
    type: "fill",
    source: "zosei-source",
    "source-layer": "polygon",
    paint: {
        // 'fill-color': 'rgba(179,253,165,0.8)'
        'fill-color': [
            'match',
            ['get', 'A54_001'],
            '1', 'rgba(179,253,165,0.8)',
            '2', 'rgba(155,155,248,0.8)',
            '9', 'rgba(0,255,0,0.8)',
            'red'
        ]
    }
}
const zoseiLayerLine = {
    id: "oh-zosei-line",
    type: "line",
    source: "zosei-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0.5,
            11, 1
        ]
    },
}
const zoseiLayerLabel = {
    id: "oh-zosei-label",
    type: "symbol",
    source: "zosei-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': [
            'match',
            ['get', 'A54_001'],
            '1', '谷埋め型',
            '2', '腹付け型',
            '9', '区分をしていない',
            'その他' // デフォルトのテキスト
        ],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'minzoom': 14
}
// 土砂災害警戒区域------------------------------------------------------------------------------------------------------
const dosyaSource = {
    id: 'dosya-source', obj: {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png'],
        tileSize: 256,
        crossOrigin: 'anonymous',
    }
}
const dosyaLayer = {
    'id': 'oh-dosya-layer',
    'type': 'raster',
    'source': 'dosya-source',
}
// 洪水浸水想定------------------------------------------------------------------------------------------------------
const kozuiSaidaiSource = {
    id: 'kozui-saidai-source', obj: {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin/{z}/{x}/{y}.png'],
        tileSize: 256,
        crossOrigin: 'anonymous',
    }
}
const kozuiSaidaiLayer = {
    'id': 'oh-kozui-saidai-layer',
    'type': 'raster',
    'source': 'kozui-saidai-source',
}
// 津波------------------------------------------------------------------------------------------------------
const tsunamiSource = {
    id: 'tsunami-source', obj: {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png'],
    }
}
const tsunamiLayer = {
    'id': 'oh-tsunami-layer',
    'type': 'raster',
    'source': 'tsunami-source',
}
// Q地図橋梁 --------------------------------------------------------------------------------------------
const qKyouryoSource = {
    id: "q-kyoryo-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/q/kyoryo/kyoryo.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const qKyoryoLayer = {
    id: "oh-q-kyoryo",
    type: "circle",
    source: "q-kyoryo-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'steelblue',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 10
        ]
    }
}
const qKyoryoLayerLabel = {
    id: "oh-q-kyoryo-label",
    type: "symbol",
    source: "q-kyoryo-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', '_html'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 13
}
// Q地図トンネル --------------------------------------------------------------------------------------------
const qTunnelSource = {
    id: "q-tunnel-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/q/tunnel/tunnel.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const qTunnelLayer = {
    id: "oh-q-tunnel",
    type: "circle",
    source: "q-tunnel-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'peru',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.1,
            4, 0.5,
            7, 2,
            11, 10
        ]
    }
}
const qTunnelLayerLabel = {
    id: "oh-q-tunnel-label",
    type: "symbol",
    source: "q-tunnel-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', '_html'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
        'visibility': 'visible',
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 10
}
// R05用途地域-----------------------------------------------------------------------------------------------------
const yotochiikiSource = {
    id: "yotochiiki-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/yotochiiki/r05/y.pmtiles",
    }
}
const yotochiikiLayer = {
    id: "oh-yotochiiki",
    type: "fill",
    source: "yotochiiki-source",
    "source-layer": "y",
    paint: {
        'fill-color': [
            'match',
            ['get', 'YoutoID'],
            1, 'rgba(92,201,59,0.8)',
            2, 'rgba(92,201,59,0.8)',
            3, 'rgba(214,254,81,0.8)',
            4, 'rgba(255,255,209,0.8)',
            5, 'rgba(255,255,84,0.8)',
            6, 'rgba(247,206,160,0.8)',
            7, 'rgba(247,206,85,0.8)',
            8, 'rgba(247,206,85,0.8)',
            9, 'rgba(247,206,252,0.8)',
            10, 'rgba(241,158,202,0.8)',
            11, 'rgba(196,155,249,0.8)',
            12, 'rgba(214,254,254,0.8)',
            13, 'rgba(164,203,203,0.8)',
            99, 'rgba(200,200,200,0.8)',
            'red'
        ]
    }
}
const yotochiikiLayerHeight = {
    id: "oh-yotochiiki-height",
    type: "fill-extrusion",
    source: "yotochiiki-source",
    "source-layer": "y",
    paint: {
        'fill-extrusion-color': [
            'match',
            ['get', 'YoutoID'],
            1, 'rgba(92,201,59,0.8)',
            2, 'rgba(92,201,59,0.8)',
            3, 'rgba(214,254,81,0.8)',
            4, 'rgba(255,255,209,0.8)',
            5, 'rgba(255,255,84,0.8)',
            6, 'rgba(247,206,160,0.8)',
            7, 'rgba(247,206,85,0.8)',
            8, 'rgba(247,206,85,0.8)',
            9, 'rgba(247,206,252,0.8)',
            10, 'rgba(241,158,202,0.8)',
            11, 'rgba(196,155,249,0.8)',
            12, 'rgba(214,254,254,0.8)',
            13, 'rgba(164,203,203,0.8)',
            99, 'rgba(200,200,200,0.8)',
            'red'
        ],
        'fill-extrusion-height': [
            'match',
            ['get', 'YoutoID'],
            1, 20, // 住宅用: 高さ20メートル
            2, 20,
            3, 30,
            4, 30,
            5, 20,
            6, 20,
            7, 20,
            9, 50, // 商業用: 高さ40メートル
            10, 60,
            11, 40, // 工業用: 高さ30メートル
            12, 40,
            13, 40,
            10 // その他: 高さ10メートル
        ],
    }
}
const yotochiikiLayerLine = {
    id: "oh-yotochiiki-line",
    type: "line",
    source: "yotochiiki-source",
    "source-layer": "y",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 0,
            11, 1
        ]
    },
}
const yotochiikiLayerLabel = {
    id: "oh-yotochiiki-label",
    type: "symbol",
    source: "yotochiiki-source",
    "source-layer": "y",
    'layout': {
        'text-field': ['get', '用途地域'],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'minzoom': 14
}
// 関東小字地図-----------------------------------------------------------------------------------------------------
// mura.pmtiles
const koazaSource = {
    id: "koaza-source", obj: {
        type: "vector",
        url: "pmtiles://https://osaru-san1.github.io/border/koaza.pmtiles",
        attribution: '<a href="https://koaza.net/">関東小字地図</a>',
    }
}
const koazaLayer = {
    id: "oh-koaza",
    type: "fill",
    source: "koaza-source",
    "source-layer": "koaza",
    paint: {
        'fill-color': 'rgba(255,255,255,0.1)'
    },
}
const koazaLayerLine = {
    id: "oh-koaza-line",
    type: "line",
    source: "koaza-source",
    "source-layer": "koaza",
    paint: {
        'line-color': 'red',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 1,
            14, 4
        ]
    },
}
const koazaLayerLabel = {
    id: "oh-koaza-label",
    type: "symbol",
    source: "koaza-source",
    "source-layer": "koaza",
    'layout': {
        'text-field': ['get', 'KOAZA_NAME'],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'red',
        'text-halo-color': 'white',
        'text-halo-width': 1.0,
    },
    'minzoom': 12
}
const muraSource = {
    id: "mura-source", obj: {
        type: "vector",
        url: "pmtiles://https://osaru-san1.github.io/border/mura.pmtiles",
        attribution: '<a href="https://koaza.net/">関東小字地図</a>',
    }
}
const muraLayer = {
    id: "oh-mura",
    type: "fill",
    source: "koaza-source",
    "source-layer": "mura",
    paint: {
        'fill-color': 'rgba(0,0,0,0)'
    },
}
const muraLayerLine = {
    id: "oh-mura-line",
    type: "line",
    source: "mura-source",
    "source-layer": "mura",
    paint: {
        'line-color': 'blue',
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0.5,
            14, 1
        ]
    },
}
// dronebird---------------------------------------------------------------------------------------------------------
const dronebirdSource = {
    id: 'dronebird-source', obj: {
        type: 'raster',
        tiles: ['https://apps.kontur.io/raster-tiler/oam/mosaic/{z}/{x}/{y}.png'],
        tileSize: 256,
    }
}
const dronebirdLayer = {
    'id': 'oh-dronebird-layer',
    'type': 'raster',
    'source': 'dronebird-source',
}
// 明治中期の郡 --------------------------------------------------------------------------------------------
const cityGunSource = {
    id: "city-gun-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/gun/gun.pmtiles",
    }
}
const cityGunLayer = {
    id: "oh-city-gun",
    type: "fill",
    source: "city-gun-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': ['get', 'random_color'],
    }
}
const cityGunLayerLine = {
    id: "oh-city-gun-line",
    type: "line",
    source: "city-gun-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
const cityGunLayerLabel = {
    id: "oh-city-gun-label",
    type: "symbol",
    source: "city-gun-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'GUN'],
        'text-font': ['NotoSansJP-Regular'],
        'symbol-placement': 'point',
    },
    'paint': {
        'text-color': 'black',
        'text-halo-color': 'white',
        'text-halo-width': 1.0,
    },
    'minzoom': 8
}
// 市町村大正09年 --------------------------------------------------------------------------------------------
const cityT09Source = {
    id: "city-t09-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/city/t09/t09.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const cityT09Layer = {
    id: "oh-city-t09",
    type: "fill",
    source: "city-t09-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': ['get', 'random_color'],
    }
}
const cityT09LayerLine = {
    id: "oh-city-t09-line",
    type: "line",
    source: "city-t09-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
const cityT09LayerLabel = {
    id: "oh-city-t09-label",
    type: "symbol",
    source: "city-t09-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'N03_004'],
        'text-font': ['NotoSansJP-Regular'],
    },
    'paint': {
        'text-color': 'black',
        'text-halo-color': 'white',
        'text-halo-width': 1.0,
    },
    'minzoom': 10
}
// 市町村令和５年 --------------------------------------------------------------------------------------------
const cityR05Source = {
    id: "city-r05-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/city/r05/r05.pmtiles",
        attribution: "<a href='' target='_blank'></a>",
    }
}
const cityR05Layer = {
    id: "oh-city-r05",
    type: "fill",
    source: "city-r05-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': ['get', 'random_color'],
    }
}
const cityR05LayerLine = {
    id: "oh-city-r05-line",
    type: "line",
    source: "city-r05-source",
    "source-layer": "polygon",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0,
            11, 0.5
        ]
    },
}
const cityR05LayerLabel = {
    id: "oh-city-r05-label",
    type: "symbol",
    source: "city-r05-source",
    "source-layer": "polygon",
    'layout': {
        'text-field': ['get', 'N03_004'],
        'text-font': ['NotoSansJP-Regular'],
        'symbol-placement': 'point',
    },
    'paint': {
        'text-color': 'black',
        'text-halo-color': 'white',
        'text-halo-width': 1.0,
    },
    'minzoom': 10
}
// 明治期の低湿地------------------------------------------------------------------------------------------------------
const shitchiSource = {
    id: 'shitchi-source', obj: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/swale/{z}/{x}/{y}.png'],
    }
}
const shitchiLayer = {
    'id': 'oh-shitchi-layer',
    'type': 'raster',
    'source': 'shitchi-source',
}
// エコリス植生図---------------------------------------------------------------------------------------------------------
const ecoris67Source = {
    id: 'ecoris67-source', obj: {
        type: 'raster',
        tiles: ['https://map.ecoris.info/tiles/vege67/{z}/{x}/{y}.png'],
    }
}
const ecoris67Layer = {
    'id': 'oh-ecoris67-layer',
    'type': 'raster',
    'source': 'ecoris67-source',
    'raster-resampling': 'nearest'
}
// 東京都土地利用現況調査----------------------------------------------------------------------------------------------------------------
export const tochiriyoSource = {
    id: "tochiriyo-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tokyotochiriyo/t.pmtiles",
    }
}
export const tochiriyoLayer = {
    id: "oh-tochiriyo",
    type: "fill",
    source: "tochiriyo-source",
    "source-layer": "t",
    paint: {
        'fill-color': [
            'match',
            ['get', 'LU_1'],

            '111', 'rgba(128,128,128,0.7)', // 官公庁施設
            '112', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(0,192,255,0.7)', // 教育施設
                '2', 'rgba(240,230,140,0.7)', // 文化施設
                '3', 'rgba(255,215,0,0.7)', // 宗教施設
                /* default */ 'rgba(0,0,0,0)' // Default color if LU_2 doesn't match
            ],
            '113', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(255,192,203,0.7)', // 医療施設
                '2', 'rgba(219,112,147,0.7)', // 厚生施設
                /* default */ 'rgba(0,0,0,0)'
            ],
            '114', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(0,0,255,0.7)', // 供給施設
                '2', 'rgba(0,0,139,0.7)', // 処理施設
                /* default */ 'rgba(0,0,0,0)'
            ],
            '121', 'rgba(255,127,80,0.7)', // 事務所建築物
            '122', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(255,0,0,0.7)', // 商業施設
                '2', 'rgba(255,99,71,0.7)', // 公衆浴場等
                /* default */ 'rgba(0,0,0,0)'
            ],
            '123', 'rgba(255,69,0,0.7)', // 住商併用建物
            '124', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(0,255,127,0.7)', // 宿泊施設
                '2', 'rgba(124,255,2,0.7)', // 遊興施設
                /* default */ 'rgba(0,0,0,0)'
            ],
            '125', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(0,255,255,0.7)', // スポーツ施設
                '2', 'rgba(64,224,208,0.7)', // 興行施設
                /* default */ 'rgba(0,0,0,0)'
            ],
            '131', 'rgba(60,179,113,0.7)', // 独立住宅
            '132', 'rgba(0,100,0,0.7)', // 集合住宅
            '141', 'rgba(105,105,105,0.7)', // 専用工場
            '142', 'rgba(169,169,169,0.7)', // 住居併用工場
            '143', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(32,178,120,0.7)', // 運輸施設等
                '2', 'rgba(95,158,160,0.7)', // 倉庫施設等
                /* default */ 'rgba(0,0,0,0)'
            ],
            '150', 'rgba(85,107,47,0.7)', // 農林漁業施設
            '210', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(250,250,120,0.7)', // 太陽光発電
                '2', 'rgba(119,136,153,0.7)', // 屋外駐車場
                '3', 'rgba(176,196,222,0.7)', // その他
                /* default */ 'rgba(0,0,0,0)'
            ],
            '300', [
                'match',
                ['get', 'LU_2'],
                '1', 'rgba(120,100,100,0.7)', // ゴルフ場
                '2', 'rgba(154,205,50,0.7)', // その他
                /* default */ 'rgba(0,0,0,0)'
            ],
            '400', 'rgba(255,222,173,0.7)', // 未利用地等
            '510', 'rgba(192,192,192,0.7)', // 道路
            '520', 'rgba(105,105,105,0.7)', // 鉄道・港湾等
            '611', 'rgba(255,165,0,0.7)', // 田
            '612', 'rgba(255,165,122,0.7)', // 畑
            '613', 'rgba(128,0,0,0.7)', // 樹園地
            '620', 'rgba(34,139,34,0.7)', // 採草放牧地
            '700', 'rgba(0,0,205,0.7)', // 水面・河川・水路
            '800', 'rgba(128,128,0,0.7)', // 原野
            '900', 'rgba(205,133,63,0.7)', // 森林
            '220', 'rgba(106,90,205,0.7)', // その他
            '0', 'rgba(128,0,128,0.7)', // 不明
            '9', 'rgba(75,0,130,0.7)', // 不整合

            /* default */ 'rgba(0,0,0,0)' // Default color if LU_1 doesn't match
        ]

    }
}
export const tochiriyoLayerLine = {
    id: "oh-tochiriyo-line",
    type: "line",
    source: "tochiriyo-source",
    "source-layer": "t",
    paint: {
        'line-color': '#000',
        'line-width': [
            'interpolate', // Zoom-based interpolation
            ['linear'],
            ['zoom'], // Use the zoom level as the input
            7, 0.1,
            11, 0.5,
            16, 1
        ]
    },
}
// 夜の光----------------------------------------------------------------------------------------------------------------
export const hikariSource = {
    id: "hikari-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/hikari/hikari.pmtiles",
    }
}
export const hikariLayer = {
    id: "oh-hikari",
    type: "fill",
    source: "hikari-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'light']],
            0, '#000000',     // Black at 0
            128, '#808000',   // Dark yellow (olive) at midpoint
            254, '#FFFF00',   // Yellow right up to 254
            255, 'gold'    // White at 255
        ]
    }
}
export const hikariLayerHeight = {
    id: "oh-hikari-height",
    type: "fill-extrusion",
    source: "hikari-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'light']],
            0, '#000000',     // Black at 0
            128, '#808000',   // Dark yellow (olive) at midpoint
            254, '#FFFF00',   // Yellow right up to 254
            255, 'gold'    // White at 255
        ],
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'light']],
            0, 10,
            254, 6000,
            255, 10000      // 20mで高さ200
        ],
    }
}
// 津波浸水想定-----------------------------------------------------------------------------------------------------
const tsunamiSource2 = {
    id: "tsunami-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz.xsrv.jp/pmtiles/tsunami/tsunami.pmtiles",
    }
}
const tsunamiLayerHeight = {
    id: "oh-tsunami-height",
    type: "fill-extrusion",
    source: "tsunami-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-color': [
            'match',
            ['get', 'A40_003'],
            '0.01m以上 ～ 0.3m未満', '#f7fcf0', // 最小カテゴリーの色（新しく追加）
            '～0.3m未満', '#d1e5f0',           // 0.3m未満の色
            '0.3m未満', '#d1e5f0',
            '0.3m以上 ～ 1.0m未満', '#a6dba0',  // 0.3~1.0mの色
            '0.3m以上 ～ 1m未満', '#a6dba0',
            '1.0m以上 ～ 2.0m未満', '#7bccc4',  // 1.0~2.0mの色
            '1m以上 ～ 2m未満', '#7bccc4',

            '0.3m以上 ～ 0.5m未満', '#d1e5f0',
            '0.5m以上 ～ 1.0m未満','#a6dba0',
            '1.0m以上 ～ 3.0m未満', '#7bccc4',
            '1m以上 ～ 3m未満', '#7bccc4',


            '2m以上 ～ 3m未満', '#7bccc4',
            '3m以上 ～ 4m未満', '#2b8cbe',
            '4m以上 ～ 5m未満', '#2b8cbe',

            '3.0m以上 ～ 5.0m未満', '#2b8cbe',
            '3m以上 ～ 5m未満','#2b8cbe',
            '5m以上 ～ 10m未満','#0868ac',
            '10m以上 ～ 20m未満', '#084081',
            '10.0m以上 ～ 20.0m未満', '#084081',

            '2.0m以上 ～ 5.0m未満', '#2b8cbe',  // 2.0~5.0mの色
            '2m以上 ～ 5m未満', '#2b8cbe',
            '5.0m以上 ～ 10.0m未満', '#0868ac', // 5.0~10.0mの色
            'gray' // 該当しない場合のデフォルトカラー
        ],
        'fill-extrusion-opacity': 0.8,
        'fill-extrusion-height': [
            'match',
            ['get', 'A40_003'],
            '0.01m以上 ～ 0.3m未満', 2,      // 新しく追加した最小カテゴリーの高さ
            '～0.3m未満', 5,
            '0.3m未満', 5,
            '0.3m以上 ～ 1.0m未満', 20,
            '0.3m以上 ～ 1m未満', 20,
            '1.0m以上 ～ 2.0m未満', 40,
            '1m以上 ～ 2m未満', 40,

            '0.3m以上 ～ 0.5m未満', 4,
            '0.5m以上 ～ 1.0m未満',20,
            '1.0m以上 ～ 3.0m未満', 40,
            '1m以上 ～ 3m未満', 40,

            '2m以上 ～ 3m未満', 50,
            '3m以上 ～ 4m未満', 60,
            '4m以上 ～ 5m未満', 70,


            '3.0m以上 ～ 5.0m未満', 80,
            '3m以上 ～ 5m未満',80,
            '5m以上 ～ 10m未満',100,
            '10m以上 ～ 20m未満', 120,
            '10.0m以上 ～ 20.0m未満',120,

            '2.0m以上 ～ 5.0m未満', 80,
            '2m以上 ～ 5m未満', 80,
            '5.0m以上 ～ 10.0m未満', 100,
            10 // デフォルトの高さ
        ]
    }
}
// 宮崎県南海トラフ-----------------------------------------------------------------------------------------------------
const nantoraSource = {
    id: "nantora-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz.xsrv.jp/pmtiles/tsunami/nantora.pmtiles",
    }
}
const nantoraLayerHeight = {
    id: "oh-nantora-height",
    type: "fill-extrusion",
    source: "nantora-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['get', '最大浸水深'],
            0, 'rgba(255,255,179,0.8)',    // 0.3m未満
            0.3, 'rgba(247,245,169,0.8)',  // 0.3~0.5m
            0.5, 'rgba(248,225,116,0.8)',  // 0.5~1.0m
            1.0, 'rgba(255,216,192,0.8)',  // 1.0~3.0m
            3.0, 'rgba(255,183,183,0.8)',  // 3.0~5.0m
            5.0, 'rgba(255,145,145,0.8)',  // 5.0~10.0m
            10.0, 'rgba(242,133,201,0.8)', // 10.0~20.0m
            20.0, 'rgba(220,122,220,0.8)'  // 20.0m以上
        ],
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['get', '最大浸水深'],
            0, 10,          // 0mで高さ10
            0.5, 15,        // 0.5mで高さ15
            1.0, 20,        // 1.0mで高さ20
            3.0, 50,        // 3.0mで高さ50
            5.0, 75,        // 5.0mで高さ75
            10.0, 125,      // 10.0mで高さ125
            20.0, 200       // 20mで高さ200
        ],
    }
}
// 北海道津波-----------------------------------------------------------------------------------------------------
const hokkaidotsunamiSource = {
    id: "hokkaidotsunami-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz.xsrv.jp/pmtiles/tsunami/hokkaidotsunami.pmtiles",
    }
}
const hokkaidotsunamiLayerHeight = {
    id: "oh-hokkaidotsunami-height",
    type: "fill-extrusion",
    source: "hokkaidotsunami-source",
    "source-layer": "polygon",
    paint: {
        'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'max'], ['get', 'MAX_SIN']],
            0, 'rgba(255,255,179,0.8)',    // 0.3m未満
            0.3, 'rgba(247,245,169,0.8)',  // 0.3~0.5m
            0.5, 'rgba(248,225,116,0.8)',  // 0.5~1.0m
            1.0, 'rgba(255,216,192,0.8)',  // 1.0~3.0m
            3.0, 'rgba(255,183,183,0.8)',  // 3.0~5.0m
            5.0, 'rgba(255,145,145,0.8)',  // 5.0~10.0m
            10.0, 'rgba(242,133,201,0.8)', // 10.0~20.0m
            20.0, 'rgba(220,122,220,0.8)'  // 20.0m以上
        ],
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'max'], ['get', 'MAX_SIN']],
            0, 10,          // 0mで高さ10
            0.5, 15,        // 0.5mで高さ15
            1.0, 20,        // 1.0mで高さ20
            3.0, 50,        // 3.0mで高さ50
            5.0, 75,        // 5.0mで高さ75
            10.0, 125,      // 10.0mで高さ125
            20.0, 200       // 20mで高さ200
        ],
    }
}
// 土地利用100mメッシュ----------------------------------------------------------------------------------------------------------------
const tochiriyo100Source = {
    id: "tochiriyo100-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/tochiriyo/tochiriyoD.pmtiles",
        // minzoom: 11
    }
}
const tochiriyo100Layer = {
    id: "oh-tochiriyo100",
    type: "fill",
    source: "tochiriyo100-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': [
            'match',
            ['get', '土地利用種別'],
            '0100', 'rgba(255,255,0,0.8)',      // 田
            '0200', 'rgba(255,204,153,0.8)',    // その他の農用地
            '0500', 'rgba(0,170,0,0.8)',        // 森林
            '0600', 'rgba(0,255,153,0.8)',      // 荒地
            '0700', 'rgba(255,0,0,0.8)',        // 建物用地
            '0901', 'rgba(140,140,140,0.8)',    // 道路
            '0902', 'rgba(180,180,180,0.8)',    // 鉄道
            '1000', 'rgba(200,70,15,0.8)',      // その他の用地
            '1100', 'rgba(0,0,255,0.8)',        // 河川地及び湖沼
            '1400', 'rgba(255,255,153,0.8)',    // 海浜
            '1500', 'rgba(0,204,255,0.8)',      // 海水域
            '1600', 'rgba(0,204,255,0.8)',      // ゴルフ場
            'rgba(0,0,0,0)' // デフォルト値（該当しない場合は透明）
        ]
    }
}// 幼稚園 --------------------------------------------------------------------------------------------
const yochienSource = {
    id: "yochien-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/yochien/yochien.pmtiles",
    }
}
const yochienLayer = {
    id: "oh-yochien-layer",
    type: "circle",
    source: "yochien-source",
    "source-layer": "point",
    'paint': {
        'circle-color': 'pink',
        'circle-radius':[
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 0.5,
            4, 1,
            7, 6,
            11, 10
        ]
    }
}
const yochienLayerLabel = {
    id: "oh-yochien-label",
    type: "symbol",
    source: "yochien-source",
    "source-layer": "point",
    'layout': {
        'text-field': ['get', 'P29_004'],
        'text-font': ['NotoSansJP-Regular'],
        'text-offset': [0, 1],
    },
    'paint': {
        'text-color': 'rgba(255, 255, 255, 0.7)',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.0,
    },
    'maxzoom': 24,
    'minzoom': 9
}
// 空港等の周辺空域 --------------------------------------------------------------------------------------------
const kokuareaSource = {
    id: "kokuarea-source", obj: {
        type: "vector",
        url: "pmtiles://https://kenzkenz3.xsrv.jp/pmtiles/kokuarea/kokuarea.pmtiles",
        'maxzoom': 8,
        'minzoom': 1
    }
}
const kokuareaLayer = {
    id: "oh-kokuarea-layer",
    type: "fill",
    source: "kokuarea-source",
    "source-layer": "polygon",
    paint: {
        'fill-color': ['get', 'rgba'],
    }
}
const kokuareaLayerLine = {
    id: "oh-kokuarea-line",
    type: "line",
    source: "kokuarea-source",
    "source-layer": "polygon",
    paint: {
        "line-color": "black",
        'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0.5,
            20, 6
        ]
    },
}
// 海洋地質図---------------------------------------------------------------------------------------------------------
const kaiyochishitsuource = {
    id: 'kaiyochishitsu-source', obj: {
        type: 'raster',
        tiles: ['https://gbank.gsj.jp/geonavi/maptile/wmts/1.0.0/MA3000_23japanes/default/EPSG900913/{z}/{y}/{x}.png'],
    }
}
const kaiyochishitsuLayer = {
    'id': 'oh-kaiyochishitsu-layer',
    'type': 'raster',
    'source': 'kaiyochishitsu-source',
    'raster-resampling': 'nearest'
}
// ---------------------------------------------------------------------------------------------------------------------
const layers01 = [
    {
        id: 1,
        label: "基本地図",
        nodes: [
            {
                id: 'oh-stdLayer',
                label: "標準地図",
                source: stdSource,
                layers: [stdLayer]
            },
            {
                id: 'oh-pale-layer',
                label: "淡色地図",
                source: paleSource,
                layers: [paleLayer]
            },
            {
                id: 'oh-vector-layer',
                label: "ベクトルタイル",
                sources: stdSources,
                layers: stdLayers
            },
            {
                id: 'oh-vector-layer-mono',
                label: "ベクトルタイルモノクロ",
                sources: monoSources,
                layers: monoLayers
            },
            // {
            //     id: 'oh-vector-layer-dark',
            //     label: "ベクトルタイルダーク",
            //     sources: darkSources,
            //     layers: darkLayers
            // },
            {
                id: 'oh-vector-layer-fx-dark',
                label: "ベクトルタイルダーク",
                sources: fxDarkSources,
                layers: fxDarkLayers
            },
            {
                id: 'oh-plateauPmtiles',
                label: "PLATEAU建物",
                source: plateauPmtilesSource,
                layers: [plateauPmtilesLayer]
            },
        ]
    },
    {
        id: 'syashin',
        label: "航空写真",
        nodes: [
            {
                id: 'oh-seamlessphoto',
                label: "最新写真",
                source: seamlessphotoSource,
                layers: [seamlessphotoLayer]
            },
            {
                id: 'oh-sp87',
                label: "1987~90年航空写真(一部)",
                source: sp87Source,
                layers: [sp87Layer]
            },
            {
                id: 'oh-sp84',
                label: "1984~86年航空写真(一部)",
                source: sp84Source,
                layers: [sp84Layer]
            },
            {
                id: 'oh-sp79',
                label: "1979~83年航空写真(一部)",
                source: sp79Source,
                layers: [sp79Layer]
            },
            {
                id: 'oh-sp74',
                label: "1974~78年航空写真(全国)",
                source: sp74Source,
                layers: [sp74Layer]
            },
            {
                id: 'oh-sp61',
                label: "1961~64年航空写真(一部)",
                source: sp61Source,
                layers: [sp61Layer]
            },
            {
                id: 'oh-sp45',
                label: "1945~50年航空写真(一部)",
                source: sp45Source,
                layers: [sp45Layer]
            },
            {
                id: 'oh-sp36',
                label: "1936~42年航空写真(一部)",
                source: sp36Source,
                layers: [sp36Layer]
            },
            {
                id: 'oh-sp28',
                label: "1928年航空写真(大阪府)",
                source: sp28Source,
                layers: [sp28Layer]
            },
            {
                id: 'oh-kanagawa-syashin',
                label: "神奈川航空写真",
                source: kanagawaSyashinSource,
                layers: [kanagawaSyashinLayer]
            },
            {
                id: 'oh-yokohama-syashin',
                label: "横浜北部、川崎航空写真",
                source: yokohamaSyashinSource,
                layers: [yokohamaSyashinLayer]
            },
            {
                id: 'oh-miyazaki-syashin',
                label: "宮崎県航空写真",
                source: miyazakiSyashinSource,
                layers: [miyazakiSyashinLayer]
            },
            {
                id: 'oh-dronebird',
                label: "DRONEBIRD",
                source: dronebirdSource,
                layers: [dronebirdLayer]
            },
        ]
    },
    {
        id: 'kochizu',
        label: "古地図等",
        nodes: [
            {
                id: 'oh-mw5',
                label: "戦前の旧版地形図（５万分の1）",
                sources: [mw5DummySource,mw5CenterSource],
                layers: [mw5DummyLayer,mw5CenterLabel]
            },
            {
                id: 'ams',
                label: "戦後の米軍地図",
                nodes: [
                    {
                        id: 'oh-ams',
                        label: "戦後の米軍作成地図全て",
                        sources: amsSources,
                        layers: amsLayers
                    },
                    ...amsLayers2,
                ]
            },
            konjyakuMap,
            {
                id: 'oh-jinsoku',
                label: "迅速測図",
                sources: [jinsokuSource],
                layers: [jinsokuLayer]
            },
            {
                id: 'oh-jissoku',
                label: "北海道実測切図",
                sources: [jissokuSource,jissokuMatsumaeSource],
                layers: [jissokuLayer,jissokuMatsumaeLayer]
            },
        ]
    },
    {
        id: 'tokei',
        label: "統計",
        nodes: [
            {
                id: 'oh-syochiiki',
                label: "国勢調査小地域人口ピラミッド",
                source: syochiikiSource,
                layers: [syochiikiLayer,syochiikLayerLine,syochiikiLayerLabel],
                ext: {name:'extSyochiiki',parameters:[]}
            },
            {
                id: 'oh-syochiiki-2',
                label: "国勢調査小地域人口密度3D",
                source: syochiikiSource,
                layers: [syochiikiLayer,syochiikiLayerHeight]
            },
            {
                id: 'oh-m100m',
                label: "100mメッシュ人口",
                source: m100mSource,
                layers: [m100mLayer,m100mLayerLine,m100mLayerLabel]
            },
            {
                id: 'oh-m100m-3d',
                label: "100mメッシュ人口3D",
                source: m100mSource,
                layers: [m100mLayer,m100mLayerLine,m100mLayerLabel,m100mLayerHeight]
            },
            {
                id: 'oh-m250m',
                label: "250mメッシュ人口",
                source: m250mSource,
                layers: [m250mLayer,m250mLayerLine,m250mLayerLabel]
            },
            {
                id: 'oh-m250m-3d',
                label: "250mメッシュ人口3D",
                source: m250mSource,
                layers: [m250mLayer,m250mLayerLine,m250mLayerLabel,m250mLayerHeight]
            },
            {
                id: 'oh-m500m',
                label: "500mメッシュ人口",
                source: m500mSource,
                layers: [m500mLayer,m500mLayerLine,m500mLayerLabel]
            },
            {
                id: 'oh-m500m-3d',
                label: "500mメッシュ人口3D",
                source: m500mSource,
                layers: [m500mLayer,m500mLayerLine,m500mLayerLabel,m500mLayerHeight]
            },
            {
                id: 'oh-m1km',
                label: "1kmメッシュ人口",
                source: m1kmSource,
                layers: [m1kmLayer,m1kmLayerLine,m1kmLayerLabel]
            },
            {
                id: 'oh-m1km-3d',
                label: "1kmメッシュ人口3D",
                source: m1kmSource,
                layers: [m1kmLayer,m1kmLayerLine,m1kmLayerLabel,m1kmLayerHeight]
            },
            {
                id: 'oh-did',
                label: "人口集中地区",
                source: didSource,
                layers: [didLayer,didLayerLine]
            },
        ]
    },
    {
        id: 'doro',
        label: "鉄道、道路等",
        nodes: [
            {
                id: 'oh-q-kyoryo',
                label: "全国橋梁地図",
                source: qKyouryoSource,
                layers: [qKyoryoLayer,qKyoryoLayerLabel],
            },
            {
                id: 'oh-q-tunnel',
                label: "全国トンネル地図",
                source: qTunnelSource,
                layers: [qTunnelLayer,qTunnelLayerLabel],
            },
            {
                id: 'oh-bus',
                label: "R04バスルートと停留所",
                sources: [busSource,busteiSource],
                layers: [busLayer,busteiLayer,busteiLayerLabel],
                attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N07-v2_0.html' target='_blank'>国土数値情報</a>",
                ext: {name:'extBus',parameters:[]}
            },
            {
                id: 'oh-tetsudo',
                label: "鉄道（廃線は赤色）",
                source: tetsudoSource,
                layers: [tetsudoLayerRed,tetsudoLayerBlue,tetsudoLayerPointRed,tetsudoLayerPointBlue],
            },
            {
                id: 'oh-tetsudojikeiretsu',
                label: "鉄道時系列",
                source: tetsudojikeiretsuSource,
                layers: [tetsudojikeiretsuLayerBlue,tetsudojikeiretsuLayerPoint],
                ext: {name:'extTetsudojikeiretsu',parameters:[]}
            },
            {
                id: 'oh-highway',
                label: "高速道路時系列",
                source: highwaySource,
                layers: [highwayLayerGreen,highwayLayerRed],
                ext: {name:'extHighway',parameters:[]}
            },
            {
                id: 'oh-kokuarea',
                label: "空港等の周辺空域",
                source: kokuareaSource,
                layers: [kokuareaLayer,kokuareaLayerLine],
            },
            {
                id: 'oh-michinoeki',
                label: "道の駅",
                source: michinoekiSource,
                layers: [michinoekiLayer,michinoekiLayerLabel],
            },
        ]
    },
    {
        id: 'skosodate',
        label: "子育て",
        nodes: [
            {
                id: 'oh-yochien',
                label: "幼稚園・保育園等（R0２）",
                source: yochienSource,
                layers: [yochienLayer,yochienLayerLabel]
            },
            {
                id: 'oh-syogakkoR05',
                label: "小学校（R05）",
                source: syogakkoR05Source,
                layers: [syogakkoR05Layer,syogakkoR05LayerLine,syogakkoR05LayerLabel,syogakkoR05LayerPoint]
            },
            {
                id: 'oh-cyugakuR05',
                label: "中学校（R05）",
                source: cyugakuR05Source,
                layers: [cyugakuR05Layer,cyugakuR05LayerLine,cyugakuR05LayerLabel,cyugakuR05LayerPoint]
            },
            {
                id: 'oh-iryokikan',
                label: "医療機関（R02）",
                source: iryokikanSource,
                layers: [iryokikanLayer,iryokikanLayerLabel]
            }
        ]
    },
    {
        id: 'city',
        label: "市町村",
        nodes: [
            {
                id: 'oh-city-gun',
                label: "明治中期の郡",
                source: cityGunSource,
                layers: [cityGunLayer,cityGunLayerLine,cityGunLayerLabel],
                attribution:'<a href="https://booth.pm/ja/items/3053727" target="_blank">郡地図研究会</a>'
            },
            {
                id: 'oh-city-t09',
                label: "T09市町村",
                source: cityT09Source,
                layers: [cityT09Layer,cityT09LayerLine,cityT09LayerLabel]
            },
            {
                id: 'oh-city-r05',
                label: "R05市町村",
                source: cityR05Source,
                layers: [cityR05Layer,cityR05LayerLine,cityR05LayerLabel]
            },
        ]
    },
    {
        id: 'bakumatsu',
        label: "幕末期近世の村",
        nodes: [
            {
                id: 'oh-bakumatsu',
                label: "幕末期近世の村",
                source: bakumatsuSource,
                layers: [bakumatsuLayer, bakumatsuLayerLine, bakumatsuLayerLabel],
                ext: {name:'extBakumatsu',parameters:[]}
            },
            {
                id: 'oh-bakumatsu-kokudaka-height',
                label: "幕末期近世の村（石高/面積）3D",
                source: bakumatsuSource,
                layers: [bakumatsuLayerHeight],
                ext: {name:'extBakumatsu3d',parameters:[]}
            },
            {
                id: 'oh-bakumatsu-poin',
                label: "幕末期近世の村（ポイント）",
                source: bakumatsuPointSource,
                layers: [bakumatsuPointLayer]
            },
        ]
    },
    {
        id: 2,
        label: "自然、立体図等",
        nodes: [
            {
                id: 'cd',
                label: "CS立体図",
                nodes: [
                    {
                        id: 'oh-cs-all',
                        label: "CS立体図全部",
                        sources: [csNotoSource,csTochigiSource,csNaganoSource,csGifuSource,csOsakaSource,csHyogoSource,csShizuokaSource,
                            csHiroshimaSource,csOkayamaSource,csFukushimaSource,csEhimeSource,csKochiSource,csKumamotoSource,csKanagawaSource,
                            tokyo23CsSource],

                        layers: [csNotoLayer,csTochigiLayer,csNaganoLayer,csGifuLayer,csOsakaLayer,csHyogoLayer,csShizuokaLayer,
                            csHiroshimaLayer,csOkayamaLayer,csFukushimaLayer,csEhimeLayer,csKochiLayer,csKumamotoLayer,csKanagawaLayer,
                            tokyo23CsLayer]
                    },
                    {
                        id: 'oh-csNotoLayer',
                        label: "能登CS立体図",
                        source: csNotoSource,
                        layers: [csNotoLayer]
                    },
                    {
                        id: 'oh-cs-tochigi-layer',
                        label: "栃木県CS立体図",
                        source: csTochigiSource,
                        layers: [csTochigiLayer],
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/csmap_tochigi" target="_blank">G空間情報センター</a>'
                    },
                    {
                        id: 'oh-cs-nagano-layer',
                        label: "長野県CS立体図",
                        source: csNaganoSource,
                        layers: [csNaganoLayer],
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/nagano-csmap" target="_blank">G空間情報センター</a>'
                    },
                    {
                        id: 'oh-csGifuLayer',
                        label: "岐阜県CS立体図",
                        source: csGifuSource,
                        layers: [csGifuLayer]
                    },
                    {
                        id: 'oh-csOsakaLayer',
                        label: "大阪府CS立体図",
                        source: csOsakaSource,
                        layers: [csOsakaLayer]
                    },
                    {
                        id: 'oh-csHyogoLayer',
                        label: "兵庫県CS立体図",
                        source: csHyogoSource,
                        layers: [csHyogoLayer]
                    },
                    {
                        id: 'oh-csShizuokaLayer',
                        label: "静岡県CS立体図",
                        source: csShizuokaSource,
                        layers: [csShizuokaLayer]
                    },
                    {
                        id: 'oh-cs-hiroshima-layer',
                        label: "広島県CS立体図",
                        source: csHiroshimaSource,
                        layers: [csHiroshimaLayer],
                        attribution:'<a href="https://github.com/shi-works/aist-dem-with-cs-on-maplibre-gl-js" target="_blank">aist-dem-with-cs-on-maplibre-gl-js</a>'
                    },
                    {
                        id: 'oh-cs-okayama-layer',
                        label: "岡山県CS立体図",
                        source: csOkayamaSource,
                        layers: [csOkayamaLayer],
                        attribution:'<a href="https://www2.ffpri.go.jp/soilmap/index.html" target="_blank">森林総研・森林土壌デジタルマップ</a>'
                    },
                    {
                        id: 'oh-cs-fukushima-layer',
                        label: "福島県CS立体図",
                        source: csFukushimaSource,
                        layers: [csFukushimaLayer],
                        attribution:'<a href="https://www2.ffpri.go.jp/soilmap/index.html" target="_blank">森林総研・森林土壌デジタルマップ</a>'
                    },
                    {
                        id: 'oh-cs-ehime-layer',
                        label: "愛媛県CS立体図",
                        source: csEhimeSource,
                        layers: [csEhimeLayer],
                        attribution:'<a href="https://www2.ffpri.go.jp/soilmap/index.html" target="_blank">森林総研・森林土壌デジタルマップ</a>'
                    },
                    {
                        id: 'oh-cs-kochi-layer',
                        label: "高知県CS立体図",
                        source: csKochiSource,
                        layers: [csKochiLayer],
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/csmap_kochi" target="_blank">G空間情報センター</a>'
                    },
                    {
                        id: 'oh-cs-kumamoto-layer',
                        label: "熊本県・大分県CS立体図",
                        source: csKumamotoSource,
                        layers: [csKumamotoLayer],
                        attribution:'<a href="https://www2.ffpri.go.jp/soilmap/index.html" target="_blank">森林総研・森林土壌デジタルマップ</a>'
                    },
                    {
                        id: 'oh-cs-kanagawa-layer',
                        label: "神奈川県CS立体図",
                        source: csKanagawaSource,
                        layers: [csKanagawaLayer]
                    },
                    {
                        id: 'oh-tokyo23-cs-layer',
                        label: "東京都23区CS立体図",
                        source: tokyo23CsSource,
                        layers: [tokyo23CsLayer]
                    },
                    {
                        id: 'oh-cs-yokohama-layer',
                        label: "横浜北部、川崎CS立体図",
                        source: csYokohamSource,
                        layers: [csYokohamaLayer]
                    },
                ]
            },
            {
                id: 'sekisyoku',
                label: "赤色立体地図",
                nodes: [
                    {
                        id: 'oh-sekisyoku-layer-all',
                        label: "赤色立体地図全部",
                        sources: [kanagawaSekisyokuSource,tamaSekisyokuSource,tokyo23SekisyokuSource,tosyo01SekisyokuSource,tosyo02SekisyokuSource,tosyo03SekisyokuSource,tosyo04SekisyokuSource,tosyo05SekisyokuSource,tosyo06SekisyokuSource,aichiSekisyokuSource,kochiSekisyokuSource],
                        layers: [kanagawaSekisyokuLayer,tamaSekisyokuLayer,tokyo23SekisyokuLayer,tosyo02SekisyokuLayer,tosyo03SekisyokuLayer,tosyo04SekisyokuLayer,tosyo05SekisyokuLayer,tosyo06SekisyokuLayer,tosyo01SekisyokuLayer,aichiSekisyokuLayer,kochiSekisyokuLayer],
                    },
                    {
                        id: 'oh-kanagawa-sekisyoku-layer',
                        label: "神奈川県赤色立体地図",
                        source: kanagawaSekisyokuSource,
                        layers: [kanagawaSekisyokuLayer],
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/kanagawa-2020-1-pointcloud" target="_blank">G空間情報センター</a>'
                    },
                    {
                        id: 'oh-tosyo-sekisyoku-layer',
                        label: "東京都赤色立体地図",
                        sources: [tamaSekisyokuSource,tokyo23SekisyokuSource,tosyo01SekisyokuSource,tosyo02SekisyokuSource,tosyo03SekisyokuSource,tosyo04SekisyokuSource,tosyo05SekisyokuSource,tosyo06SekisyokuSource],
                        layers: [tamaSekisyokuLayer,tokyo23SekisyokuLayer,tosyo02SekisyokuLayer,tosyo03SekisyokuLayer,tosyo04SekisyokuLayer,tosyo05SekisyokuLayer,tosyo06SekisyokuLayer,tosyo01SekisyokuLayer],
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/tokyopc-23ku-2024" target="_blank">G空間情報センター</a>'
                    },
                    {
                        id: 'oh-aichiSekisyokuLayer',
                        label: "愛知県赤色立体地図",
                        source: aichiSekisyokuSource,
                        layers: [aichiSekisyokuLayer]
                    },
                    {
                        id: 'oh-kochi-sekisyoku-layer',
                        label: "高知県赤色立体地図",
                        sources: [kochiSekisyokuSource],
                        layers: [kochiSekisyokuLayer],
                        attribution:'<a href="https://www.geospatial.jp/ckan/dataset/sekisyoku" target="_blank">G空間情報センター</a>'
                    },

                ]},
            {
                id: 'oh-shitchi',
                label: "第6-7回植生図",
                source: ecoris67Source,
                layers: [ecoris67Layer],
                attribution: "<a href='https://map.ecoris.info/' target='_blank'>エコリス地図タイル</a>" +
                    '<div class="legend-scale">' +
                        '<ul class="legend-labels">' +
                            '<li><span style="background:#fdf1ce;"></span>高山帯自然植生</li>' +
                            '<li><span style="background:#997f60;"></span>コケモモートウヒクラス域 自然植生</li>' +
                            '<li><span style="background:#a58f74;"></span>〃 代償植生</li>' +
                            '<li><span style="background:#178017;"></span>ブナクラス域 自然植生</li>' +
                            '<li><span style="background:#5b9700;"></span>〃 代償植生</li>' +
                            '<li><span style="background:#003300;"></span>ヤブツバキクラス域 自然植生</li>' +
                            '<li><span style="background:#004a00;"></span>〃 代償植生</li>' +
                            '<li><span style="background:#ffff00;"></span>河川・湿原・沼沢地・砂丘植生</li>' +
                            '<li><span style="background:#697720;"></span>植林地</li>' +
                            '<li><span style="background:#8cd27d;"></span>耕作地</li>' +
                            '<li><span style="background:#868585;"></span>市街地</li>' +
                            '<li><span style="background:#99ffff;"></span>開放水域</li>' +
                            '<li><span style="background:#cccc20;"></span>竹林</li>' +
                            '<li><span style="background:#69ff00;"></span>牧草地・ゴルフ場・芝地</li>' +
                            '<li><span style="background:#999662;"></span>水田以外の耕作地</li>' +
                        '</ul>' +
                    '</div>'
            },
            {
                id: 'oh-shitchi',
                label: "明治期の低湿地",
                source: shitchiSource,
                layers: [shitchiLayer]
            },
            {
                id: 'oh-shikibetsu',
                label: "色別標高図",
                source: shikibetsuSource,
                layers: [shikibetsuLayer]
            },
            {
                id: 'oh-inei',
                label: "陰影起伏図",
                source: ineiSource,
                layers: [ineiLayer]
            },
            {
                id: 'oh-kawadak',
                label: "川だけ地形地図",
                source: kawadakeSource,
                layers: [kawddakeLayer]
            },
            {
                id: 'oh-ryuiki',
                label: "川と流域地図",
                source: ryuikiSource,
                layers: [ryuikiLayer]
            },
            {
                id: 'oh-kasen',
                label: "河川",
                source: kasenSource,
                layers: [kasenLayer,kasenLayerLabel]
            },
            {
                id: 'oh-chikeibunrui',
                label: "地形分類",
                source: chikeibunruiSource,
                layers: [chikeibunruiLayer]
            },
        ]
    },
    {
        id: 'iseki',
        label: "遺跡等",
        nodes: [
            {
                id: 'oh-kyusekki',
                label: "全国旧石器遺跡",
                source: kyusekkiSource,
                layers: [kyusekkiLayer,kyusekkiLayerHeatmap],
            },
        ]
    },
    {
        id: 'hazard',
        label: "ハザードマップ等",
        nodes: [
            // {
            //     id: 'oh-tokyojishin',
            //     label: "地震に関する危険度一覧(東京都)",
            //     source: tokyojishinSource,
            //     layers: [tokyojishinLayer,tokyojishinLayerLine,tokyojishinLayerLabel,tokyojishinheight],
            // },
            {
                id: 'oh-hinanjyo-kozui',
                label: "指定緊急避難場所(洪水)",
                source: hinanjyoKozuiSource,
                layers: [hinanjyoKozuiLayer,hinanjyoKozuiLayerLabel],
            },
            {
                id: 'oh-hinanjyo-dosekiryu',
                label: "指定緊急避難場所(崖崩れ等)",
                source: hinanjyoDosekiryuSource,
                layers: [hinanjyoDosekiryuLayer,hinanjyoDosekiryuLayerLabel],
                attribution: '指定緊急避難場所(崖崩れ、土石流及び地滑り)'
            },
            {
                id: 'oh-kozui-saidai',
                label: "洪水浸水想定（想定最大規模）",
                source: kozuiSaidaiSource,
                layers: [kozuiSaidaiLayer],
            },
            {
                id: 'oh-tsunami',
                label: "津波浸水想定",
                source: tsunamiSource,
                layers: [tsunamiLayer],
            },
            {
                id: 'oh-tsunami-height',
                label: "津波浸水想定3D",
                source: tsunamiSource2,
                layers: [tsunamiLayerHeight],
            },
            {
                id: 'oh-nantora-height',
                label: "宮崎県南海トラフ津波浸水想定3D",
                source: nantoraSource,
                layers: [nantoraLayerHeight],
            },
            {
                id: 'oh-hokkaidotsunami-height',
                label: "北海道津波浸水想定3D",
                source: hokkaidotsunamiSource,
                layers: [hokkaidotsunamiLayerHeight],
            },
            {
                id: 'oh-dosya',
                label: "土砂災害警戒区域",
                source: dosyaSource,
                layers: [dosyaLayer],
            },
            {
                id: 'oh-zosei',
                label: "R05大規模盛土造成地",
                source: zoseiSource,
                layers: [zoseiLayer,zoseiLayerLine,zoseiLayerLabel],
                attribution: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A54-2023.html" target="_blank">国土数値情報</a>'
            },
            {
                id: 'oh-tokyojishin',
                label: "地震に関する危険度一覧(東京都)",
                source: tokyojishinSource,
                layers: [tokyojishinLayerSogo,tokyojishinLayerLine,tokyojishinLayerLabel],
            },
            {
                id: 'oh-tokyojishin3d',
                label: "地震に関する危険度一覧(東京都)3D",
                source: tokyojishinSource,
                layers: [tokyojishinLayerSogo,tokyojishinLayerLine,tokyojishinLayerLabel,tokyojishinheightSogo],
            },
            {
                id: 'oh-densyohi',
                label: "災害伝承碑",
                source: densyohiSource,
                layers: [densyohiLayer],
            },
        ]
    },
    {
        id: 'sonohoka',
        label: "その他",
        nodes: [
            {
                id: 'oh-kaiyochishitsu',
                label: "海洋地質図",
                source: kaiyochishitsuource,
                layers:[kaiyochishitsuLayer],
                attribution: "<a href='https://www.msil.go.jp/msil/htm/main.html?Lang=0' target='_blank'>海洋状況表示システム</a>"
            },
            {
                id: 'oh-tochiriyo100',
                label: "2021土地利用細分メッシュ(100m)",
                source: tochiriyo100Source,
                layers:[tochiriyo100Layer],
                attribution: "<a href='' target='_blank'></a>"
            },
            {
                id: 'oh-tochiriyo',
                label: "東京都土地利用現況調査",
                source: tochiriyoSource,
                layers:[tochiriyoLayer,tochiriyoLayerLine],
                attribution: "<a href='https://catalog.data.metro.tokyo.lg.jp/dataset/t000008d2000000019' target='_blank'>土地利用現況調査GISデータ</a>"
            },
            {
                id: 'oh-senkyoku',
                label: "選挙区（2022）",
                source: senkyokuSource,
                layers:[senkyokuLayer,senkyokuLayerLine,senkyokuLayerLabel]
            },
            {
                id: 'oh-koji',
                label: "公示価格（R06）",
                source: kojiSource,
                layers:[kojiLayerPoint,kojiLayerLabel]
            },
            {
                id: 'oh-koji-3d',
                label: "公示価格（R06）3D",
                source: kojiSource,
                layers:[kojilayerheight]
            },
            {
                id: 'oh-nihonrekishi',
                label: "日本歴史地名大系",
                source: nihonrekishiSource,
                layers:[nihonrekishiLayer,nihonrekishiLayerLabel]
            },
            {
                id: 'oh-amx-a-fude',
                label: "登記所備付地図データ",
                source: amxSource,
                layers:[amxLayer,amxLayerLine,amxLayerDaihyou,amxLayerLabel]
            },
        ]
    },
    {
        id: 'test',
        label: "テスト",
        nodes: [
            {
                id: 'oh-jinjya',
                label: "延喜式神名帳式内社(神社)",
                source: jinjyaSource,
                layers: [jinjyaLayer,jinjyaLayerLabel]
            },
            {
                id: 'oh-hikari',
                label: "夜のあかり",
                source: hikariSource,
                layers: [hikariLayer]
            },
            {
                id: 'oh-hikari-height',
                label: "夜のあかり3D",
                source: hikariSource,
                layers: [hikariLayerHeight]
            },
            {
                id: 'oh-koaza',
                label: "関東小字地図テスト",
                sources: [koazaSource,muraSource],
                layers: [koazaLayer,koazaLayerLine,koazaLayerLabel,muraLayer,muraLayerLine],
                attribution: '<a href="https://koaza.net/">関東小字地図</a>'
            },
            {
                id: 'oh-yotochiiki',
                label: "用途地域",
                source: yotochiikiSource,
                layers: [yotochiikiLayer,yotochiikiLayerLine,yotochiikiLayerLabel]
            },
            {
                id: 'oh-yotochiiki-3d',
                label: "用途地域3D",
                source: yotochiikiSource,
                layers: [yotochiikiLayer,yotochiikiLayerLine,yotochiikiLayerLabel,yotochiikiLayerHeight]
            },
            {
                id: 'test2',
                label: "標準地図",
                nodes: [
                    {
                        id: 'test3',
                        label: "標準地図",
                        nodes: [
                            {
                                id: 'oh-stdLayer',
                                label: "テスト標準地図",
                                source: stdSource,
                                layers: [stdLayer]
                            },
                        ]
                    },
                ]
            },
        ]
    },
]
const layers02 = JSON.parse(JSON.stringify(layers01))
export const layers = {
    map01: layers01,
    map02: layers02
}