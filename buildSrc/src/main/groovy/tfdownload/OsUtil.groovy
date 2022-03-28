package tfdownload

import org.apache.tools.ant.taskdefs.condition.Os
import org.gradle.api.GradleException

class OsUtil {
  /* Can't use a plugin like google/os-detector because Terraform uses a different
  architecture naming scheme. */
  static String getClassifier() {
    if (Os.isFamily(Os.FAMILY_WINDOWS)) {
      if (Os.isArch("amd64")) {
        return "windows_amd64"
      }
    } else if (Os.isFamily(Os.FAMILY_UNIX)) {
      if (Os.isArch("amd64")) {
        return "linux_amd64"
      }
    }

    println System.properties
    throw new GradleException("Don't know classifier for current platform")
  }
}
