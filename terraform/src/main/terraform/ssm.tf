resource "aws_ssm_parameter" "google-credentials-client-id" {
  lifecycle {
    ignore_changes = [value, version]
  }
  tags        = {}
  name        = "google-credentials-client-id"
  description = "ManagedBy ${local.sourcecode}, but value is ignored"
  type        = "String"
  value       = "xxx"
}

resource "aws_ssm_parameter" "google-credentials-client-secret" {
  lifecycle {
    ignore_changes = [value, version]
  }
  tags        = {}
  name        = "google-credentials-client-secret"
  description = "ManagedBy ${local.sourcecode}, but value is ignored"
  type        = "SecureString"
  value       = "xxx"
}
