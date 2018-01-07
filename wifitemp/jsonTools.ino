String findJsonKey(String str, String key) {
  int index = str.indexOf(key);
  if (index == -1) {
    return "";
  } else {
    int breakIndex = str.indexOf("\n", index);
    // +4 for ": " and - 2 for ",
    return str.substring(index + key.length() + 4, breakIndex - 2);
  }
}

