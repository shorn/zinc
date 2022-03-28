variable "tfd_region" {
  default = "us-east-1"
}

locals {
  sourcecode = "github.com/shorn/cognito-poc"
}

/*
can't parameterise because:
 "terraform.backend: configuration cannot contain interpolations
*/
terraform {
  required_version = ">= 1.0"

  /* S3 bucket is used to init and store TF state information.
  Bucket must be manually created before TF can be run. */
  backend "s3" {
    bucket = "cognito-poc-state"
    key    = "cognito-poc.tfstate"
    region = "us-east-1"
  }

  required_providers {
    aws = {
      // hostname makes clear this is actually an external dependency
      source  = "registry.terraform.io/hashicorp/aws"
      version = "4.8.0"
    }
  }
}

provider "aws" {
  region = var.tfd_region
}


